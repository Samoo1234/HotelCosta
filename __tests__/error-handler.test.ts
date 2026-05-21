import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  handleError,
  handleApiError,
  handleStatusChangeError,
  handleCheckInError,
  handleCheckOutError,
  handleCancellationError,
  handleConsumptionError,
  handlePaymentError,
  getErrorMessageConfig,
  createValidationResultFromErrorType,
  getStatusTransitionErrorMessage,
  getErrorSuggestions,
  generateErrorCode,
  ReservationStatus,
  ValidationResult
} from '../lib/error-handler'

describe('Error Handler module (lib/error-handler.ts)', () => {
  beforeEach(() => {
    // Spy on console.error to avoid polluting the test outputs
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateErrorCode', () => {
    it('should generate code with correct prefix and context code', () => {
      const code = generateErrorCode('check-in', 'test')
      expect(code).toMatch(/^RES-CI-TEST-\d{4}$/)
    })

    it('should handle missing context code', () => {
      const code = generateErrorCode('check-out')
      expect(code).toMatch(/^RES-CO-\d{4}$/)
    })

    it('should map unknown error types to UN', () => {
      // @ts-expect-error - testing invalid error type mapping
      const code = generateErrorCode('invalid-type')
      expect(code).toMatch(/^RES-UN-\d{4}$/)
    })
  })

  describe('getStatusTransitionErrorMessage', () => {
    it('should return check-in transition error from confirmed to checked_out', () => {
      const msg = getStatusTransitionErrorMessage('confirmed', 'checked_out')
      expect(msg).toContain('Não é possível alterar o status de confirmada para check-out realizado diretamente')
    })

    it('should return error for checked_in to confirmed', () => {
      const msg = getStatusTransitionErrorMessage('checked_in', 'confirmed')
      expect(msg).toContain('Não é possível voltar ao status confirmada após o check-in ter sido realizado')
    })

    it('should return error for checked_out transition', () => {
      const msg = getStatusTransitionErrorMessage('checked_out', 'confirmed')
      expect(msg).toContain('Esta reserva já teve o check-out realizado')
    })

    it('should return default transition error message for other invalid transitions', () => {
      const msg = getStatusTransitionErrorMessage('cancelled', 'checked_in')
      expect(msg).toContain('Esta reserva foi cancelada e não pode ser alterada para check-in realizado')
    })
  })

  describe('getErrorSuggestions', () => {
    it('should return standard suggestions for error types', () => {
      const suggestions = getErrorSuggestions('check-in')
      expect(suggestions).toContain('Verifique se o quarto está disponível')
    })

    it('should return transition specific suggestions', () => {
      const suggestions = getErrorSuggestions('status-change', 'confirmed', 'checked_out')
      expect(suggestions).toContain('Realize o check-in da reserva primeiro')
    })

    it('should return generic suggestions for invalid status terminal states', () => {
      const suggestions = getErrorSuggestions('status-change', 'checked_out', 'confirmed')
      expect(suggestions).toContain('Esta reserva está em um status final e não pode ser alterada')
    })
  })

  describe('getErrorMessageConfig', () => {
    it('should return correct config for each error type', () => {
      const checkInConfig = getErrorMessageConfig('check-in')
      expect(checkInConfig.title).toBe('Erro ao realizar check-in')
      expect(checkInConfig.severity).toBe('error')

      const generalConfig = getErrorMessageConfig('general')
      expect(generalConfig.title).toBe('Erro inesperado')
    })
  })

  describe('createValidationResultFromErrorType', () => {
    it('should create valid false ValidationResult with mapped properties', () => {
      const result = createValidationResultFromErrorType('payment')
      expect(result.valid).toBe(false)
      expect(result.severity).toBe('error')
      expect(result.message).toBe(getErrorMessageConfig('payment').message)
      expect(result.suggestions).toEqual(getErrorMessageConfig('payment').suggestions)
    })

    it('should respect custom message override', () => {
      const customMsg = 'Mensagem de teste customizada'
      const result = createValidationResultFromErrorType('payment', customMsg)
      expect(result.message).toBe(customMsg)
    })
  })

  describe('handleError', () => {
    it('should return formatted error info and print console.error', () => {
      const err = new Error('Original Error Message')
      const result = handleError({
        errorType: 'check-in',
        error: err,
        context: 'test-suite',
        reservationId: 'res-123'
      })

      expect(result.errorCode).toMatch(/^RES-CI-TEST-\d{4}$/)
      expect(result.message).toBe('Não foi possível realizar o check-in para esta reserva.')
      expect(result.title).toBe('Erro ao realizar check-in')
      expect(result.severity).toBe('error')
      expect(result.details.reservationId).toBe('res-123')
      expect(console.error).toHaveBeenCalled()
    })

    it('should respect custom message and suggestions overrides', () => {
      const result = handleError({
        errorType: 'server',
        error: 'some string error',
        customMessage: 'Custom error message',
        customTitle: 'Custom Title',
        customSuggestions: ['Try this', 'Or that'],
        logError: false
      })

      expect(result.message).toBe('Custom error message')
      expect(result.title).toBe('Custom Title')
      expect(result.suggestions).toEqual(['Try this', 'Or that'])
      expect(console.error).not.toHaveBeenCalled()
    })

    it('should extract error message from validation result if present', () => {
      const validationResult: ValidationResult = {
        valid: false,
        message: 'Validation message override',
        severity: 'warning',
        suggestions: ['Check validation fields']
      }

      const result = handleError({
        errorType: 'validation',
        error: 'err',
        validationResult
      })

      expect(result.message).toBe('Validation message override')
      expect(result.severity).toBe('warning')
      expect(result.suggestions).toEqual(['Check validation fields'])
    })
  })

  describe('handleApiError', () => {
    it('should identify network errors', () => {
      const err = new Error('network failed to fetch')
      const result = handleApiError(err, 'api')
      expect(result.errorCode).toMatch(/^RES-NW-API-\d{4}$/)
      expect(result.title).toBe('Erro de conexão')
    })

    it('should identify permission errors', () => {
      const err = new Error('unauthorized access forbidden')
      const result = handleApiError(err, 'api')
      expect(result.errorCode).toMatch(/^RES-PM-API-\d{4}$/)
      expect(result.title).toBe('Permissão negada')
    })

    it('should identify not-found errors', () => {
      const err = new Error('resource not found 404')
      const result = handleApiError(err, 'api')
      expect(result.errorCode).toMatch(/^RES-NF-API-\d{4}$/)
      expect(result.title).toBe('Recurso não encontrado')
    })

    it('should default to server error for generic API errors', () => {
      const err = new Error('something crashed on the server')
      const result = handleApiError(err, 'api')
      expect(result.errorCode).toMatch(/^RES-SV-API-\d{4}$/)
      expect(result.title).toBe('Erro no servidor')
    })
  })

  describe('Specific error handlers helpers', () => {
    const errObj = new Error('Fail')

    it('should trigger correctly with custom configurations', () => {
      const statusRes = handleStatusChangeError(errObj, 'confirmed', 'checked_in', 'res-1')
      expect(statusRes.errorCode).toMatch(/^RES-SC-STAT-\d{4}$/)

      const checkInRes = handleCheckInError(errObj, 'res-1')
      expect(checkInRes.errorCode).toMatch(/^RES-CI-CHEC-\d{4}$/)

      const checkOutRes = handleCheckOutError(errObj, 'res-1')
      expect(checkOutRes.errorCode).toMatch(/^RES-CO-CHEC-\d{4}$/)

      const cancelRes = handleCancellationError(errObj, 'res-1')
      expect(cancelRes.errorCode).toMatch(/^RES-CA-CANC-\d{4}$/)

      const consumptionRes = handleConsumptionError(errObj, 'res-1')
      expect(consumptionRes.errorCode).toMatch(/^RES-CN-CONS-\d{4}$/)

      const paymentRes = handlePaymentError(errObj, 'res-1')
      expect(paymentRes.errorCode).toMatch(/^RES-PA-PAYM-\d{4}$/)
    })
  })
})
