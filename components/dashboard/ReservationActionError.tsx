import React from 'react';
import { ReservationStatus } from '@/app/dashboard/reservations/[id]/details/actions';
import { ValidationResult } from '@/lib/reservation-validations';
import ReservationErrorNotification from './ReservationErrorNotification';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ReservationActionErrorProps {
  error: Error | unknown;
  actionType: 'check-in' | 'check-out' | 'cancel' | 'status-change' | 'payment' | 'consumption' | 'general';
  reservationId: string;
  currentStatus?: ReservationStatus;
  targetStatus?: ReservationStatus;
  validationResult?: ValidationResult;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

/**
 * Component for displaying reservation action errors with retry functionality
 */
export default function ReservationActionError({
  error,
  actionType,
  reservationId,
  currentStatus,
  targetStatus,
  validationResult,
  onRetry,
  onDismiss,
  compact = false
}: ReservationActionErrorProps) {
  // If we have a validation result, use ReservationErrorNotification
  if (validationResult) {
    return (
      <ReservationErrorNotification
        errorType={actionType}
        validationResult={validationResult}
        reservationId={reservationId}
        currentStatus={currentStatus}
        targetStatus={targetStatus}
        errorDetails={error}
        onRetry={onRetry}
        onClose={onDismiss}
      />
    );
  }
  
  // If compact mode is requested, show a simpler error
  if (compact) {
    return (
      <div className="text-red-600 text-sm flex items-center">
        <AlertTriangle className="h-4 w-4 mr-1" />
        <span>
          {getErrorMessage(error, actionType)}
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-2 text-blue-600 hover:text-blue-800 text-xs flex items-center"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Tentar novamente
          </button>
        )}
      </div>
    );
  }
  
  // Otherwise, use ReservationErrorNotification with error details
  return (
    <ReservationErrorNotification
      errorType={actionType}
      reservationId={reservationId}
      currentStatus={currentStatus}
      targetStatus={targetStatus}
      errorDetails={error}
      onRetry={onRetry}
      onClose={onDismiss}
    />
  );
}

/**
 * Gets a user-friendly error message based on the error and action type
 */
function getErrorMessage(error: Error | unknown, actionType: string): string {
  const baseMessage = error instanceof Error ? error.message : String(error);
  
  // If the message is too technical or generic, provide a more user-friendly message
  if (baseMessage.includes('fetch') || 
      baseMessage.includes('network') || 
      baseMessage.includes('Failed to') ||
      baseMessage === '[object Object]') {
    
    switch (actionType) {
      case 'check-in':
        return 'Não foi possível realizar o check-in. Tente novamente.';
      case 'check-out':
        return 'Não foi possível realizar o check-out. Tente novamente.';
      case 'cancel':
        return 'Não foi possível cancelar a reserva. Tente novamente.';
      case 'status-change':
        return 'Não foi possível alterar o status da reserva. Tente novamente.';
      case 'payment':
        return 'Não foi possível processar o pagamento. Tente novamente.';
      case 'consumption':
        return 'Não foi possível gerenciar os consumos. Tente novamente.';
      default:
        return 'Ocorreu um erro. Tente novamente.';
    }
  }
  
  return baseMessage;
}