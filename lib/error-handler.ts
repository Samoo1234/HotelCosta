/**
 * Type definition for reservation status
 */
export type ReservationStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';

/**
 * Interface for validation result
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  suggestions?: string[];
}

/**
 * Types of reservation errors that can occur
 */
export type ReservationErrorType = 
  | 'check-in' 
  | 'check-out' 
  | 'cancel' 
  | 'status-change' 
  | 'payment' 
  | 'consumption' 
  | 'validation' 
  | 'server' 
  | 'network' 
  | 'permission' 
  | 'not-found' 
  | 'general';

/**
 * Interface for error handling options
 */
interface ErrorHandlerOptions {
  errorType: ReservationErrorType;
  error: Error | unknown;
  context?: string;
  reservationId?: string;
  currentStatus?: ReservationStatus;
  targetStatus?: ReservationStatus;
  customMessage?: string;
  customTitle?: string;
  customSuggestions?: string[];
  validationResult?: ValidationResult;
  showToast?: boolean;
  logError?: boolean;
  onRetry?: () => void;
}

/**
 * Handles errors in a consistent way across the application
 * @param options Error handling options
 * @returns Error information object
 */
export function handleError({
  errorType,
  error,
  context = 'general',
  reservationId,
  currentStatus,
  targetStatus,
  customMessage,
  customTitle,
  customSuggestions,
  validationResult,
  showToast = true,
  logError = true,
  onRetry
}: ErrorHandlerOptions) {
  // Get error message from the error object
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Get error configuration based on error type
  const errorConfig = getErrorMessageConfig(errorType);
  
  // Generate error code for tracking
  const errorCode = generateErrorCode(errorType, context);
  
  // Get suggestions based on error type and status
  const suggestions = customSuggestions || 
    (validationResult?.suggestions?.length ? validationResult.suggestions : 
      getErrorSuggestions(errorType, currentStatus, targetStatus));
  
  // Create error details object
  const errorDetails = {
    errorType,
    errorCode,
    context,
    reservationId,
    currentStatus,
    targetStatus,
    originalError: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error
  };
  
  // Log error if requested
  if (logError) {
    console.error(
      `Error in ${context}:${errorType}`,
      errorDetails
    );
  }
  
  // Determine message to display
  let displayMessage = customMessage;
  
  if (!displayMessage) {
    if (validationResult?.message) {
      displayMessage = validationResult.message;
    } else if (currentStatus && targetStatus && errorType === 'status-change') {
      displayMessage = getStatusTransitionErrorMessage(currentStatus, targetStatus);
    } else {
      displayMessage = errorConfig.message;
    }
  }
  
  // Return error information
  return {
    errorCode,
    message: displayMessage,
    title: customTitle || errorConfig.title,
    suggestions,
    details: errorDetails,
    severity: validationResult?.severity || errorConfig.severity
  };
}

/**
 * Handles API errors with appropriate error messages
 * @param error Error object from API call
 * @param context Context where the error occurred
 * @param showToast Whether to show a toast notification
 * @returns Error information object
 */
export function handleApiError(
  error: Error | unknown,
  context: string,
  showToast = true
) {
  // Determine error type based on error message or properties
  let errorType: ReservationErrorType = 'server';
  let customMessage: string | undefined;
  
  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('connection')) {
      errorType = 'network';
    } else if (error.message.includes('permission') || error.message.includes('unauthorized') || error.message.includes('forbidden')) {
      errorType = 'permission';
    } else if (error.message.includes('not found') || error.message.includes('404')) {
      errorType = 'not-found';
    } else if (error.message.includes('validation')) {
      errorType = 'validation';
    }
    
    customMessage = error.message;
  }
  
  return handleError({
    errorType,
    error,
    context,
    customMessage,
    showToast,
    logError: true
  });
}

/**
 * Handles reservation status change errors
 * @param error Error object
 * @param currentStatus Current reservation status
 * @param targetStatus Target reservation status
 * @param reservationId Reservation ID
 * @param validationResult Optional validation result
 * @returns Error information object
 */
export function handleStatusChangeError(
  error: Error | unknown,
  currentStatus: ReservationStatus,
  targetStatus: ReservationStatus,
  reservationId: string,
  validationResult?: ValidationResult
) {
  return handleError({
    errorType: 'status-change',
    error,
    context: 'status-change',
    reservationId,
    currentStatus,
    targetStatus,
    validationResult
  });
}

/**
 * Handles check-in errors
 * @param error Error object
 * @param reservationId Reservation ID
 * @param validationResult Optional validation result
 * @returns Error information object
 */
export function handleCheckInError(
  error: Error | unknown,
  reservationId: string,
  validationResult?: ValidationResult
) {
  return handleError({
    errorType: 'check-in',
    error,
    context: 'check-in',
    reservationId,
    validationResult
  });
}

/**
 * Handles check-out errors
 * @param error Error object
 * @param reservationId Reservation ID
 * @param validationResult Optional validation result
 * @returns Error information object
 */
export function handleCheckOutError(
  error: Error | unknown,
  reservationId: string,
  validationResult?: ValidationResult
) {
  return handleError({
    errorType: 'check-out',
    error,
    context: 'check-out',
    reservationId,
    validationResult
  });
}

/**
 * Handles cancellation errors
 * @param error Error object
 * @param reservationId Reservation ID
 * @param validationResult Optional validation result
 * @returns Error information object
 */
export function handleCancellationError(
  error: Error | unknown,
  reservationId: string,
  validationResult?: ValidationResult
) {
  return handleError({
    errorType: 'cancel',
    error,
    context: 'cancellation',
    reservationId,
    validationResult
  });
}

/**
 * Handles consumption management errors
 * @param error Error object
 * @param reservationId Reservation ID
 * @param context Additional context
 * @returns Error information object
 */
export function handleConsumptionError(
  error: Error | unknown,
  reservationId: string,
  context: string = 'consumption'
) {
  return handleError({
    errorType: 'consumption',
    error,
    context,
    reservationId
  });
}

/**
 * Handles payment processing errors
 * @param error Error object
 * @param reservationId Reservation ID
 * @param context Additional context
 * @returns Error information object
 */
export function handlePaymentError(
  error: Error | unknown,
  reservationId: string,
  context: string = 'payment'
) {
  return handleError({
    errorType: 'payment',
    error,
    context,
    reservationId
  });
}

/**
 * Interface for error message configuration
 */
interface ErrorMessageConfig {
  title: string;
  message: string;
  suggestions: string[];
  severity: 'error' | 'warning' | 'info';
}

/**
 * Maps error types to specific error messages and suggestions
 */
const ERROR_MESSAGES: Record<ReservationErrorType, ErrorMessageConfig> = {
  'check-in': {
    title: 'Erro ao realizar check-in',
    message: 'Não foi possível realizar o check-in para esta reserva.',
    suggestions: [
      'Verifique se o quarto está disponível',
      'Confirme os dados do hóspede',
      'Verifique se a reserva está no status correto'
    ],
    severity: 'error'
  },
  'check-out': {
    title: 'Erro ao realizar check-out',
    message: 'Não foi possível realizar o check-out para esta reserva.',
    suggestions: [
      'Verifique se todos os consumos foram finalizados',
      'Confirme se o pagamento foi processado',
      'Verifique se a reserva está no status correto'
    ],
    severity: 'error'
  },
  'cancel': {
    title: 'Erro ao cancelar reserva',
    message: 'Não foi possível cancelar esta reserva.',
    suggestions: [
      'Verifique se a reserva está em um status que permite cancelamento',
      'Confirme se não há operações pendentes',
      'Tente novamente em alguns instantes'
    ],
    severity: 'error'
  },
  'status-change': {
    title: 'Erro ao alterar status',
    message: 'Não foi possível alterar o status da reserva.',
    suggestions: [
      'Verifique se a transição de status é permitida',
      'Confirme se todas as condições para a mudança de status foram atendidas',
      'Verifique se há operações pendentes que impedem a mudança'
    ],
    severity: 'error'
  },
  'payment': {
    title: 'Erro no processamento do pagamento',
    message: 'Ocorreu um erro ao processar o pagamento.',
    suggestions: [
      'Verifique os dados de pagamento',
      'Confirme se o valor está correto',
      'Tente utilizar outro método de pagamento'
    ],
    severity: 'error'
  },
  'consumption': {
    title: 'Erro ao gerenciar consumos',
    message: 'Ocorreu um erro ao gerenciar os consumos da reserva.',
    suggestions: [
      'Verifique se os itens foram registrados corretamente',
      'Confirme os valores antes de finalizar',
      'Tente atualizar a página e tentar novamente'
    ],
    severity: 'error'
  },
  'validation': {
    title: 'Erro de validação',
    message: 'Os dados fornecidos não são válidos.',
    suggestions: [
      'Verifique se todos os campos obrigatórios foram preenchidos',
      'Confirme se os valores estão no formato correto',
      'Corrija os erros indicados e tente novamente'
    ],
    severity: 'error'
  },
  'server': {
    title: 'Erro no servidor',
    message: 'Ocorreu um erro no servidor ao processar sua solicitação.',
    suggestions: [
      'Tente novamente em alguns instantes',
      'Se o problema persistir, entre em contato com o suporte',
      'Verifique os logs do sistema para mais detalhes'
    ],
    severity: 'error'
  },
  'network': {
    title: 'Erro de conexão',
    message: 'Não foi possível conectar ao servidor.',
    suggestions: [
      'Verifique sua conexão com a internet',
      'Tente novamente em alguns instantes',
      'Se o problema persistir, entre em contato com o suporte'
    ],
    severity: 'error'
  },
  'permission': {
    title: 'Permissão negada',
    message: 'Você não tem permissão para realizar esta operação.',
    suggestions: [
      'Verifique se você está logado corretamente',
      'Entre em contato com o administrador para solicitar acesso',
      'Tente acessar a funcionalidade através do menu principal'
    ],
    severity: 'error'
  },
  'not-found': {
    title: 'Recurso não encontrado',
    message: 'O recurso solicitado não foi encontrado.',
    suggestions: [
      'Verifique se o ID ou referência está correto',
      'A reserva pode ter sido removida ou alterada',
      'Retorne à lista de reservas e tente novamente'
    ],
    severity: 'error'
  },
  'general': {
    title: 'Erro inesperado',
    message: 'Ocorreu um erro inesperado ao processar sua solicitação.',
    suggestions: [
      'Atualize a página e tente novamente',
      'Limpe o cache do navegador',
      'Se o problema persistir, entre em contato com o suporte'
    ],
    severity: 'error'
  }
};

/**
 * Gets error message configuration for a specific error type
 * @param errorType Type of error
 * @returns Error message configuration
 */
export function getErrorMessageConfig(errorType: ReservationErrorType): ErrorMessageConfig {
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES.general;
}

/**
 * Creates a validation result from an error type
 * @param errorType Type of error
 * @param customMessage Optional custom message to override default
 * @returns ValidationResult object
 */
export function createValidationResultFromErrorType(
  errorType: ReservationErrorType,
  customMessage?: string
): ValidationResult {
  const config = getErrorMessageConfig(errorType);
  
  return {
    valid: false,
    message: customMessage || config.message,
    severity: config.severity,
    suggestions: config.suggestions
  };
}

/**
 * Gets a descriptive error message for status transition errors
 * @param currentStatus Current reservation status
 * @param targetStatus Target reservation status
 * @returns Error message with context
 */
export function getStatusTransitionErrorMessage(
  currentStatus: ReservationStatus,
  targetStatus: ReservationStatus
): string {
  // Map status codes to readable names
  const statusNames: Record<ReservationStatus, string> = {
    confirmed: 'confirmada',
    checked_in: 'check-in realizado',
    checked_out: 'check-out realizado',
    cancelled: 'cancelada',
    no_show: 'não compareceu'
  };
  
  // Specific error messages for common invalid transitions
  switch (currentStatus) {
    case 'confirmed':
      if (targetStatus === 'checked_out') {
        return `Não é possível alterar o status de ${statusNames[currentStatus]} para ${statusNames[targetStatus]} diretamente. É necessário realizar o check-in primeiro.`;
      }
      break;
    case 'checked_in':
      if (targetStatus === 'confirmed') {
        return `Não é possível voltar ao status ${statusNames[targetStatus]} após o check-in ter sido realizado.`;
      }
      if (targetStatus === 'no_show') {
        return `Não é possível marcar como ${statusNames[targetStatus]} uma reserva que já teve check-in.`;
      }
      break;
    case 'checked_out':
      return `Esta reserva já teve o check-out realizado e não pode ser alterada para ${statusNames[targetStatus]}.`;
    case 'cancelled':
      return `Esta reserva foi cancelada e não pode ser alterada para ${statusNames[targetStatus]}.`;
    case 'no_show':
      return `Esta reserva foi marcada como não compareceu e não pode ser alterada para ${statusNames[targetStatus]}.`;
  }
  
  return `Transição de status inválida: ${statusNames[currentStatus]} → ${statusNames[targetStatus]}`;
}

/**
 * Gets suggestions for resolving a specific error
 * @param errorType Type of error
 * @param currentStatus Current reservation status (optional)
 * @param targetStatus Target reservation status (optional)
 * @returns Array of suggestion strings
 */
export function getErrorSuggestions(
  errorType: ReservationErrorType,
  currentStatus?: ReservationStatus,
  targetStatus?: ReservationStatus
): string[] {
  const baseSuggestions = getErrorMessageConfig(errorType).suggestions;
  
  // Add specific suggestions based on status transition
  if (errorType === 'status-change' && currentStatus && targetStatus) {
    switch (currentStatus) {
      case 'confirmed':
        if (targetStatus === 'checked_out') {
          return [
            'Realize o check-in da reserva primeiro',
            'Após o check-in, você poderá realizar o check-out',
            'Verifique o fluxo correto de status da reserva'
          ];
        }
        break;
      case 'checked_out':
      case 'cancelled':
      case 'no_show':
        return [
          'Esta reserva está em um status final e não pode ser alterada',
          'Se necessário, crie uma nova reserva',
          'Entre em contato com o suporte para casos excepcionais'
        ];
    }
  }
  
  return baseSuggestions;
}

/**
 * Generates an error code for tracking and reference
 * @param errorType Type of error
 * @param context Additional context (optional)
 * @returns Formatted error code string
 */
export function generateErrorCode(
  errorType: ReservationErrorType,
  context?: string
): string {
  const typeCode = {
    'check-in': 'CI',
    'check-out': 'CO',
    'cancel': 'CA',
    'status-change': 'SC',
    'payment': 'PA',
    'consumption': 'CN',
    'validation': 'VA',
    'server': 'SV',
    'network': 'NW',
    'permission': 'PM',
    'not-found': 'NF',
    'general': 'GE'
  }[errorType] || 'UN';
  
  const contextCode = context ? `-${context.substring(0, 4).toUpperCase()}` : '';
  const randomCode = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `RES-${typeCode}${contextCode}-${randomCode}`;
}