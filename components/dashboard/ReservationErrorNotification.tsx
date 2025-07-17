import { ValidationResult } from '../dashboard/ReservationActionErrorHandler';
import DetailedErrorNotification from './DetailedErrorNotification';
import { ReservationStatus } from '../dashboard/ReservationActionErrorHandler';

interface ReservationErrorProps {
  errorType: 'check-in' | 'check-out' | 'cancel' | 'status-change' | 'payment' | 'consumption' | 'general';
  validationResult?: ValidationResult;
  reservationId?: string;
  currentStatus?: ReservationStatus;
  targetStatus?: ReservationStatus;
  errorDetails?: any;
  onClose?: () => void;
  onRetry?: () => void;
}

/**
 * Component for displaying reservation-specific error notifications with
 * contextual information and suggestions based on the error type
 */
export default function ReservationErrorNotification({
  errorType,
  validationResult,
  reservationId,
  currentStatus,
  targetStatus,
  errorDetails,
  onClose,
  onRetry
}: ReservationErrorProps) {
  // If we have a validation result, use that for the message and suggestions
  if (validationResult) {
    const { message, severity = 'error', suggestions = [] } = validationResult;
    
    // Generate error code based on error type and statuses
    const errorCode = generateErrorCode(errorType, currentStatus, targetStatus);
    
    // Get context for logging
    const context = `reservation-${errorType}`;
    
    // Get title based on error type
    const title = getErrorTitle(errorType, currentStatus, targetStatus);
    
    // Add additional suggestions based on error type
    const enhancedSuggestions = enhanceSuggestions(errorType, suggestions, currentStatus, targetStatus);
    
    // Create action button if retry function is provided
    const actionButton = onRetry ? {
      label: 'Tentar novamente',
      onClick: onRetry
    } : undefined;
    
    return (
      <DetailedErrorNotification
        type={severity}
        title={title}
        message={message || ''}
        suggestions={enhancedSuggestions}
        errorCode={errorCode}
        errorDetails={errorDetails}
        context={context}
        onClose={onClose}
        actionButton={actionButton}
      />
    );
  }
  
  // If no validation result, create a generic error message
  return (
    <DetailedErrorNotification
      type="error"
      title={getErrorTitle(errorType, currentStatus, targetStatus)}
      message="Ocorreu um erro ao processar sua solicitação."
      suggestions={[
        "Verifique sua conexão com a internet",
        "Atualize a página e tente novamente",
        "Se o problema persistir, entre em contato com o suporte"
      ]}
      errorCode={generateErrorCode(errorType, currentStatus, targetStatus)}
      errorDetails={errorDetails}
      context={`reservation-${errorType}`}
      onClose={onClose}
      actionButton={onRetry ? {
        label: 'Tentar novamente',
        onClick: onRetry
      } : undefined}
    />
  );
}

/**
 * Generates an error code based on the error type and statuses
 */
function generateErrorCode(
  errorType: string, 
  currentStatus?: ReservationStatus, 
  targetStatus?: ReservationStatus
): string {
  const typeCode = {
    'check-in': 'CI',
    'check-out': 'CO',
    'cancel': 'CA',
    'status-change': 'SC',
    'payment': 'PA',
    'consumption': 'CN',
    'general': 'GE'
  }[errorType] || 'UN';
  
  const statusCode = currentStatus && targetStatus 
    ? `${currentStatus.substring(0, 2).toUpperCase()}${targetStatus.substring(0, 2).toUpperCase()}`
    : 'XXXX';
  
  return `RES-${typeCode}-${statusCode}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

/**
 * Gets a descriptive title based on the error type and statuses
 */
function getErrorTitle(
  errorType: string, 
  currentStatus?: ReservationStatus, 
  targetStatus?: ReservationStatus
): string {
  switch (errorType) {
    case 'check-in':
      return 'Erro ao realizar check-in';
    case 'check-out':
      return 'Erro ao realizar check-out';
    case 'cancel':
      return 'Erro ao cancelar reserva';
    case 'status-change':
      if (currentStatus && targetStatus) {
        const statusNames: Record<string, string> = {
          confirmed: 'confirmada',
          checked_in: 'check-in',
          checked_out: 'check-out',
          cancelled: 'cancelada',
          no_show: 'não compareceu'
        };
        return `Erro ao alterar status de ${statusNames[currentStatus] || currentStatus} para ${statusNames[targetStatus] || targetStatus}`;
      }
      return 'Erro ao alterar status da reserva';
    case 'payment':
      return 'Erro ao processar pagamento';
    case 'consumption':
      return 'Erro ao gerenciar consumos';
    case 'general':
    default:
      return 'Erro na reserva';
  }
}

/**
 * Enhances suggestions based on error type and statuses
 */
function enhanceSuggestions(
  errorType: string,
  baseSuggestions: string[],
  currentStatus?: ReservationStatus,
  targetStatus?: ReservationStatus
): string[] {
  // Start with the base suggestions
  const suggestions = [...baseSuggestions];
  
  // Add specific suggestions based on error type
  switch (errorType) {
    case 'check-in':
      if (!suggestions.some(s => s.includes('quarto'))) {
        suggestions.push('Verifique se o quarto está disponível e pronto para uso');
      }
      if (!suggestions.some(s => s.includes('hóspede'))) {
        suggestions.push('Confirme os dados do hóspede antes de tentar novamente');
      }
      break;
      
    case 'check-out':
      if (!suggestions.some(s => s.includes('consumo'))) {
        suggestions.push('Verifique se todos os consumos foram registrados e finalizados');
      }
      if (!suggestions.some(s => s.includes('pagamento'))) {
        suggestions.push('Confirme se o pagamento foi processado corretamente');
      }
      break;
      
    case 'cancel':
      if (!suggestions.some(s => s.includes('política'))) {
        suggestions.push('Verifique a política de cancelamento aplicável');
      }
      break;
      
    case 'status-change':
      if (currentStatus === 'confirmed' && targetStatus === 'checked_out') {
        suggestions.push('É necessário realizar o check-in antes do check-out');
      }
      break;
      
    case 'payment':
      if (!suggestions.some(s => s.includes('pagamento'))) {
        suggestions.push('Verifique se os dados de pagamento estão corretos');
        suggestions.push('Tente utilizar outro método de pagamento');
      }
      break;
      
    case 'consumption':
      if (!suggestions.some(s => s.includes('consumo'))) {
        suggestions.push('Verifique se os itens de consumo foram registrados corretamente');
        suggestions.push('Confirme os valores antes de finalizar');
      }
      break;
  }
  
  return suggestions;
}