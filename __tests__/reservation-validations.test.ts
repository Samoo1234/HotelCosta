import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isValidStatusTransition,
  getTransitionErrorMessage,
  validateCheckIn,
  validateCheckOut,
  validateCancellation,
  validateNoShow,
  validateFinalizeConsumptions,
  validateStatusTransition,
  validateReservationModification,
  validatePayment,
  ReservationValidationData,
  ConsumptionValidationData
} from '../lib/reservation-validations'

// Mocking the logging module to prevent Supabase or cookies operations during tests
vi.mock('../lib/logging', () => ({
  logValidationError: vi.fn().mockResolvedValue({ success: true }),
  LogCategory: {
    RESERVATION: 'reservation',
    PAYMENT: 'payment',
    USER: 'user',
    SYSTEM: 'system',
    CONSUMPTION: 'consumption',
    ROOM: 'room',
    GUEST: 'guest'
  }
}))

describe('Reservation Validations module (lib/reservation-validations.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isValidStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(isValidStatusTransition('confirmed', 'checked_in')).toBe(true)
      expect(isValidStatusTransition('confirmed', 'cancelled')).toBe(true)
      expect(isValidStatusTransition('confirmed', 'no_show')).toBe(true)
      expect(isValidStatusTransition('checked_in', 'checked_out')).toBe(true)
      expect(isValidStatusTransition('checked_in', 'cancelled')).toBe(true)
    })

    it('should reject invalid transitions', () => {
      expect(isValidStatusTransition('confirmed', 'checked_out')).toBe(false)
      expect(isValidStatusTransition('checked_in', 'confirmed')).toBe(false)
      expect(isValidStatusTransition('checked_out', 'checked_in')).toBe(false)
      expect(isValidStatusTransition('cancelled', 'confirmed')).toBe(false)
      expect(isValidStatusTransition('no_show', 'checked_in')).toBe(false)
    })
  })

  describe('getTransitionErrorMessage', () => {
    it('should return empty string for valid transitions', () => {
      expect(getTransitionErrorMessage('confirmed', 'checked_in')).toBe('')
    })

    it('should explain invalid transitions in Portuguese', () => {
      expect(getTransitionErrorMessage('confirmed', 'checked_out')).toContain('Não é possível realizar check-out sem antes fazer o check-in')
      expect(getTransitionErrorMessage('checked_in', 'confirmed')).toContain('Não é possível voltar ao status de confirmada')
      expect(getTransitionErrorMessage('checked_out', 'confirmed')).toContain('Esta reserva já foi finalizada')
      expect(getTransitionErrorMessage('cancelled', 'confirmed')).toContain('Esta reserva foi cancelada')
    })
  })

  describe('validateCheckIn', () => {
    const validReservation: ReservationValidationData = {
      id: 'res-1',
      status: 'confirmed',
      check_in_date: new Date().toISOString().split('T')[0],
      check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      total_amount: 150,
      guest_id: 'guest-1',
      room_id: 'room-1',
      room: {
        room_number: '101',
        room_type: 'Standard',
        status: 'available'
      }
    }

    it('should approve valid check-in', () => {
      const result = validateCheckIn(validReservation)
      expect(result.valid).toBe(true)
    })

    it('should reject check-in if reservation is not confirmed', () => {
      const invalidRes = { ...validReservation, status: 'cancelled' as const }
      const result = validateCheckIn(invalidRes)
      expect(result.valid).toBe(false)
      expect(result.message).toContain('deve estar confirmada')
    })

    it('should reject check-in if room is occupied', () => {
      const invalidRes = {
        ...validReservation,
        room: { ...validReservation.room!, status: 'occupied' }
      }
      const result = validateCheckIn(invalidRes)
      expect(result.valid).toBe(false)
      expect(result.message).toContain('está ocupado')
    })

    it('should reject check-in if room is in maintenance', () => {
      const invalidRes = {
        ...validReservation,
        room: { ...validReservation.room!, status: 'maintenance' }
      }
      const result = validateCheckIn(invalidRes)
      expect(result.valid).toBe(false)
      expect(result.message).toContain('está em manutenção')
    })

    it('should reject check-in too far in the future', () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const invalidRes = { ...validReservation, check_in_date: futureDate }
      const result = validateCheckIn(invalidRes)
      expect(result.valid).toBe(false)
      expect(result.message).toContain('mais de 7 dias no futuro')
    })

    it('should reject check-in too far in the past', () => {
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const invalidRes = { ...validReservation, check_in_date: pastDate }
      const result = validateCheckIn(invalidRes)
      expect(result.valid).toBe(false)
      expect(result.message).toContain('há mais de 3 dias')
    })
  })

  describe('validateCheckOut', () => {
    const validReservation: ReservationValidationData = {
      id: 'res-1',
      status: 'checked_in',
      check_in_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      check_out_date: new Date().toISOString().split('T')[0],
      total_amount: 150,
      guest_id: 'guest-1',
      room_id: 'room-1'
    }

    it('should approve valid check-out with no consumptions', () => {
      const result = validateCheckOut(validReservation, [])
      expect(result.valid).toBe(true)
    })

    it('should allow check-out with pending consumptions but show a warning', () => {
      const consumptions: ConsumptionValidationData[] = [
        { id: 'c-1', status: 'pending', total_amount: 20, product: { name: 'Água' } }
      ]
      const result = validateCheckOut(validReservation, consumptions)
      expect(result.valid).toBe(true)
      expect(result.severity).toBe('warning')
      expect(result.message).toContain('consumo(s) pendente(s) que serão finalizados automaticamente')
    })
  })

  describe('validateCancellation', () => {
    const validReservation: ReservationValidationData = {
      id: 'res-1',
      status: 'confirmed',
      check_in_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      check_out_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
      total_amount: 150,
      guest_id: 'guest-1',
      room_id: 'room-1'
    }

    it('should allow cancellation for confirmed reservation', () => {
      const result = validateCancellation(validReservation)
      expect(result.valid).toBe(true)
    })

    it('should show warning for cancelling a checked-in reservation', () => {
      const checkedInRes = { ...validReservation, status: 'checked_in' as const }
      const result = validateCancellation(checkedInRes)
      expect(result.valid).toBe(true)
      expect(result.severity).toBe('warning')
    })
  })

  describe('validateNoShow', () => {
    const validReservation: ReservationValidationData = {
      id: 'res-1',
      status: 'confirmed',
      check_in_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      check_out_date: new Date().toISOString().split('T')[0],
      total_amount: 150,
      guest_id: 'guest-1',
      room_id: 'room-1'
    }

    it('should allow no-show if date is in the past', () => {
      const result = validateNoShow(validReservation)
      expect(result.valid).toBe(true)
    })

    it('should reject no-show if check-in date is in the future', () => {
      const futureRes = {
        ...validReservation,
        check_in_date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
      }
      const result = validateNoShow(futureRes)
      expect(result.valid).toBe(false)
      expect(result.message).toContain('antes da data de check-in prevista')
    })
  })

  describe('validateFinalizeConsumptions', () => {
    it('should handle empty consumptions', () => {
      const result = validateFinalizeConsumptions([])
      expect(result.valid).toBe(false)
      expect(result.severity).toBe('info')
    })

    it('should identify pending consumptions to finalize', () => {
      const consumptions: ConsumptionValidationData[] = [
        { id: 'c-1', status: 'pending', total_amount: 20, product: { name: 'Água' } }
      ]
      const result = validateFinalizeConsumptions(consumptions)
      expect(result.valid).toBe(true)
      expect(result.message).toContain('consumo(s) pendente(s) serão finalizados')
    })
  })

  describe('validateReservationModification', () => {
    const validReservation: ReservationValidationData = {
      id: 'res-1',
      status: 'confirmed',
      check_in_date: new Date().toISOString().split('T')[0],
      check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      total_amount: 150,
      guest_id: 'guest-1',
      room_id: 'room-1'
    }

    it('should allow modifying confirmed reservation', () => {
      const result = validateReservationModification(validReservation)
      expect(result.valid).toBe(true)
    })

    it('should reject modifying final state checked_out reservation', () => {
      const finalized = { ...validReservation, status: 'checked_out' as const }
      const result = validateReservationModification(finalized)
      expect(result.valid).toBe(false)
    })
  })

  describe('validatePayment', () => {
    const validReservation: ReservationValidationData = {
      id: 'res-1',
      status: 'confirmed',
      check_in_date: new Date().toISOString().split('T')[0],
      check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      total_amount: 150,
      guest_id: 'guest-1',
      room_id: 'room-1'
    }

    it('should allow valid payment amount', () => {
      const result = validatePayment(validReservation, 50)
      expect(result.valid).toBe(true)
    })

    it('should reject zero or negative payment amount', () => {
      const result = validatePayment(validReservation, 0)
      expect(result.valid).toBe(false)
      expect(result.message).toContain('maior que zero')
    })
  })
})
