import { describe, it, expect, vi } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  calculateNights,
  getLocalISOString,
  formatDateForInput,
  createTimezoneAwareDate,
  getTimezoneOffset,
  generateReservationCode,
  getStatusColor,
  getStatusText
} from '../lib/utils'

describe('Utils module (lib/utils.ts)', () => {
  describe('formatCurrency', () => {
    it('should format values correctly in BRL currency format', () => {
      expect(formatCurrency(150)).toContain('150,00')
      expect(formatCurrency(2500.5)).toContain('2.500,50')
      expect(formatCurrency(0)).toContain('0,00')
    })
  })

  describe('formatDate', () => {
    it('should format dates as dd/mm/yyyy in pt-BR', () => {
      const date = '2026-05-19T12:00:00Z'
      expect(formatDate(date)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
      expect(formatDate(new Date(date))).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    })

    it('should handle invalid dates gracefully', () => {
      expect(formatDate('invalid-date')).toBe('Data inválida')
    })
  })

  describe('formatDateTime', () => {
    it('should format dates with time in pt-BR', () => {
      const date = '2026-05-19T12:30:00Z'
      expect(formatDateTime(date)).toMatch(/^\d{2}\/\d{2}\/\d{4}(,\s|\s)\d{2}:\d{2}$/)
    })

    it('should handle invalid date-times gracefully', () => {
      expect(formatDateTime('invalid-date-time')).toBe('Data inválida')
    })
  })

  describe('calculateNights', () => {
    it('should calculate the correct number of nights between two dates', () => {
      expect(calculateNights('2026-05-19', '2026-05-22')).toBe(3)
      expect(calculateNights('2026-05-19', '2026-05-20')).toBe(1)
    })

    it('should return 0 or calculate correctly even if dates are identical', () => {
      expect(calculateNights('2026-05-19', '2026-05-19')).toBe(0)
    })
  })

  describe('getLocalISOString', () => {
    it('should generate an ISO string with the timezone offset', () => {
      const localStr = getLocalISOString('America/Sao_Paulo')
      expect(localStr).toContain('-03:00')
    })
  })

  describe('formatDateForInput', () => {
    it('should format a date for a standard HTML date input (YYYY-MM-DD)', () => {
      const date = new Date('2026-05-19T15:00:00.000Z')
      expect(formatDateForInput(date, 'UTC')).toBe('2026-05-19')
    })
  })

  describe('createTimezoneAwareDate', () => {
    it('should create a Date object aligned with the target timezone', () => {
      const date = createTimezoneAwareDate('2026-05-19', '14:00', 'America/Sao_Paulo')
      expect(date).toBeInstanceOf(Date)
    })
  })

  describe('getTimezoneOffset', () => {
    it('should calculate the timezone offset in milliseconds', () => {
      const offset = getTimezoneOffset('America/Sao_Paulo')
      expect(typeof offset).toBe('number')
    })
  })

  describe('generateReservationCode', () => {
    it('should generate an 8-character alphanumeric string', () => {
      const code1 = generateReservationCode()
      const code2 = generateReservationCode()
      expect(code1).toHaveLength(8)
      expect(code2).toHaveLength(8)
      expect(code1).not.toBe(code2)
    })
  })

  describe('getStatusColor', () => {
    it('should return the correct status class based on status value', () => {
      expect(getStatusColor('available')).toBe('status-available')
      expect(getStatusColor('occupied')).toBe('status-occupied')
      expect(getStatusColor('maintenance')).toBe('status-maintenance')
      expect(getStatusColor('reserved')).toBe('status-reserved')
      expect(getStatusColor('unknown_status')).toBe('bg-gray-100 text-gray-800')
    })
  })

  describe('getStatusText', () => {
    it('should return the correct Portuguese translation for a status', () => {
      expect(getStatusText('available')).toBe('Disponível')
      expect(getStatusText('occupied')).toBe('Ocupado')
      expect(getStatusText('maintenance')).toBe('Manutenção')
      expect(getStatusText('reserved')).toBe('Reservado')
      expect(getStatusText('checked_in')).toBe('Check-in')
      expect(getStatusText('checked_out')).toBe('Check-out')
      expect(getStatusText('cancelled')).toBe('Cancelado')
    })
  })
})
