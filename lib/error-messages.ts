import { ReservationStatus } from '@/app/dashboard/reservations/[id]/details/actions';
import { ValidationResult } from './reservation-validations';

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