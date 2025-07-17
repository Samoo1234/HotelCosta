import { useState } from 'react';

// Define ReservationStatus type if it's not available
export type ReservationStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';

// Define ValidationResult type if it's not available
export interface ValidationResult {
  valid: boolean;
  message?: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  suggestions?: string[];
}

// Import local components
import ReservationErrorNotification from './ReservationErrorNotification';
import { showValidationResultToast } from './DetailedToast';
import { useOnlineStatus } from './OfflineErrorNotification';

// Define error handler functions if they're not available
const handleApiError = (error: any, context: string) => {
  console.error(`API Error in ${context}:`, error);
  return { errorCode: 'API-ERR', message: String(error), title: 'API Error', suggestions: [], details: error, severity: 'error' as const };
};

const handleCheckInError = (error: any, reservationId: string, validationResult?: ValidationResult) => {
  console.error(`Check-in Error for reservation ${reservationId}:`, error);
  return handleApiError(error, 'check-in');
};

const handleCheckOutError = (error: any, reservationId: string, validationResult?: ValidationResult) => {
  console.error(`Check-out Error for reservation ${reservationId}:`, error);
  return handleApiError(error, 'check-out');
};

const handleCancellationError = (error: any, reservationId: string, validationResult?: ValidationResult) => {
  console.error(`Cancellation Error for reservation ${reservationId}:`, error);
  return handleApiError(error, 'cancellation');
};

const handleStatusChangeError = (error: any, currentStatus: ReservationStatus, targetStatus: ReservationStatus, reservationId: string, validationResult?: ValidationResult) => {
  console.error(`Status Change Error for reservation ${reservationId} (${currentStatus} -> ${targetStatus}):`, error);
  return handleApiError(error, 'status-change');
};

const handleNetworkError = (options: { error: any, operation?: string, context?: string, showToast?: boolean }) => {
  console.error(`Network Error in ${options.context || 'unknown'}:`, options.error);
  return { errorCode: 'NET-ERR', message: String(options.error), title: 'Network Error', suggestions: [], details: options.error, severity: 'error' as const };
};

interface ReservationActionErrorHandlerProps {
  children: (props: {
    isLoading: boolean;
    handleAction: (action: () => Promise<any>) => Promise<any>;
    error: Error | null;
    clearError: () => void;
  }) => React.ReactNode;
  reservationId: string;
  actionType: 'check-in' | 'check-out' | 'cancel' | 'status-change' | 'payment' | 'consumption' | 'general';
  currentStatus?: ReservationStatus;
  targetStatus?: ReservationStatus;
  showInlineError?: boolean;
}

/**
 * Component that handles errors for reservation actions
 * and provides loading state and error handling
 */
export default function ReservationActionErrorHandler({
  children,
  reservationId,
  actionType,
  currentStatus,
  targetStatus,
  showInlineError = false
}: ReservationActionErrorHandlerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const isOnline = useOnlineStatus();
  
  /**
   * Handles an action with proper error handling
   */
  const handleAction = async (action: () => Promise<any>) => {
    // Check if online before attempting the action
    if (!isOnline) {
      const offlineError = new Error('Você está offline. Esta ação requer conexão com a internet.');
      setError(offlineError);
      
      handleNetworkError({
        error: offlineError,
        operation: getOperationName(actionType),
        context: actionType,
        showToast: true
      });
      
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    setValidationResult(null);
    
    try {
      const result = await action();
      setIsLoading(false);
      return result;
    } catch (err) {
      setIsLoading(false);
      
      // Check if the error contains validation result
      const validationError = extractValidationResult(err);
      if (validationError) {
        setValidationResult(validationError);
        
        // Handle specific error types
        handleSpecificError(err, validationError);
      } else {
        // Handle as regular error
        setError(err instanceof Error ? err : new Error(String(err)));
        handleSpecificError(err);
      }
      
      return null;
    }
  };
  
  /**
   * Handles specific error types based on action type
   */
  const handleSpecificError = (err: any, validationResult?: ValidationResult) => {
    switch (actionType) {
      case 'check-in':
        handleCheckInError(err, reservationId, validationResult);
        break;
      case 'check-out':
        handleCheckOutError(err, reservationId, validationResult);
        break;
      case 'cancel':
        handleCancellationError(err, reservationId, validationResult);
        break;
      case 'status-change':
        if (currentStatus && targetStatus) {
          handleStatusChangeError(err, currentStatus, targetStatus, reservationId, validationResult);
        } else {
          handleApiError(err, 'status-change');
        }
        break;
      default:
        handleApiError(err, actionType);
    }
  };
  
  /**
   * Extracts validation result from error object if present
   */
  const extractValidationResult = (error: any): ValidationResult | null => {
    if (!error) return null;
    
    // Check if error has validationResult property
    if (error.validationResult && typeof error.validationResult === 'object') {
      return error.validationResult;
    }
    
    // Check if error is a validation result itself
    if (error.valid !== undefined && typeof error.valid === 'boolean') {
      return error as ValidationResult;
    }
    
    // Check if error has a data property with validation result
    if (error.data && error.data.validationResult) {
      return error.data.validationResult;
    }
    
    return null;
  };
  
  const clearError = () => {
    setError(null);
    setValidationResult(null);
  };
  
  return (
    <>
      {children({
        isLoading,
        handleAction,
        error,
        clearError
      })}
      
      {showInlineError && (error || validationResult) && (
        <div className="mt-4">
          <ReservationErrorNotification
            errorType={actionType}
            validationResult={validationResult || undefined}
            reservationId={reservationId}
            currentStatus={currentStatus}
            targetStatus={targetStatus}
            errorDetails={error}
            onClose={clearError}
            onRetry={() => setIsLoading(false)}
          />
        </div>
      )}
    </>
  );
}

/**
 * Hook for handling reservation action errors
 */
export function useReservationActionError(
  reservationId: string,
  actionType: 'check-in' | 'check-out' | 'cancel' | 'status-change' | 'payment' | 'consumption' | 'general',
  currentStatus?: ReservationStatus,
  targetStatus?: ReservationStatus
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const isOnline = useOnlineStatus();
  
  /**
   * Handles an action with proper error handling
   */
  const handleAction = async (action: () => Promise<any>) => {
    // Check if online before attempting the action
    if (!isOnline) {
      const offlineError = new Error('Você está offline. Esta ação requer conexão com a internet.');
      setError(offlineError);
      
      handleNetworkError({
        error: offlineError,
        operation: getOperationName(actionType),
        context: actionType,
        showToast: true
      });
      
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    setValidationResult(null);
    
    try {
      const result = await action();
      setIsLoading(false);
      return result;
    } catch (err) {
      setIsLoading(false);
      
      // Check if the error contains validation result
      const validationError = extractValidationResult(err);
      if (validationError) {
        setValidationResult(validationError);
        
        // Handle specific error types
        handleSpecificError(err, validationError);
      } else {
        // Handle as regular error
        setError(err instanceof Error ? err : new Error(String(err)));
        handleSpecificError(err);
      }
      
      return null;
    }
  };
  
  /**
   * Handles specific error types based on action type
   */
  const handleSpecificError = (err: any, validationResult?: ValidationResult) => {
    switch (actionType) {
      case 'check-in':
        handleCheckInError(err, reservationId, validationResult);
        break;
      case 'check-out':
        handleCheckOutError(err, reservationId, validationResult);
        break;
      case 'cancel':
        handleCancellationError(err, reservationId, validationResult);
        break;
      case 'status-change':
        if (currentStatus && targetStatus) {
          handleStatusChangeError(err, currentStatus, targetStatus, reservationId, validationResult);
        } else {
          handleApiError(err, 'status-change');
        }
        break;
      default:
        handleApiError(err, actionType);
    }
  };
  
  /**
   * Extracts validation result from error object if present
   */
  const extractValidationResult = (error: any): ValidationResult | null => {
    if (!error) return null;
    
    // Check if error has validationResult property
    if (error.validationResult && typeof error.validationResult === 'object') {
      return error.validationResult;
    }
    
    // Check if error is a validation result itself
    if (error.valid !== undefined && typeof error.valid === 'boolean') {
      return error as ValidationResult;
    }
    
    // Check if error has a data property with validation result
    if (error.data && error.data.validationResult) {
      return error.data.validationResult;
    }
    
    return null;
  };
  
  const clearError = () => {
    setError(null);
    setValidationResult(null);
  };
  
  const showError = () => {
    if (validationResult) {
      showValidationResultToast(
        validationResult,
        getActionTitle(actionType),
        actionType,
        undefined,
        error ? { error: error.message } : undefined
      );
    }
  };
  
  return {
    isLoading,
    error,
    validationResult,
    handleAction,
    clearError,
    showError,
    isOnline
  };
}

/**
 * Gets a title for an action type
 */
function getActionTitle(actionType: string): string {
  switch (actionType) {
    case 'check-in':
      return 'Erro ao realizar check-in';
    case 'check-out':
      return 'Erro ao realizar check-out';
    case 'cancel':
      return 'Erro ao cancelar reserva';
    case 'status-change':
      return 'Erro ao alterar status';
    case 'payment':
      return 'Erro no processamento do pagamento';
    case 'consumption':
      return 'Erro ao gerenciar consumos';
    default:
      return 'Erro na reserva';
  }
}

/**
 * Gets an operation name for an action type
 */
function getOperationName(actionType: string): string {
  switch (actionType) {
    case 'check-in':
      return 'realizar check-in';
    case 'check-out':
      return 'realizar check-out';
    case 'cancel':
      return 'cancelar reserva';
    case 'status-change':
      return 'alterar status';
    case 'payment':
      return 'processar pagamento';
    case 'consumption':
      return 'gerenciar consumos';
    default:
      return 'processar reserva';
  }
}