import React, { ReactNode } from 'react';
import { ReservationStatus } from './actions';
import ReservationActionErrorHandler from '@/components/dashboard/ReservationActionErrorHandler';
import { NetworkStatusIndicator } from '@/components/dashboard/NetworkErrorBoundary';

interface ReservationActionsWrapperProps {
  children: ReactNode;
  reservationId: string;
  currentStatus: ReservationStatus;
  showErrorBoundary?: boolean;
}

/**
 * Wrapper component for reservation actions that provides error handling
 * and network status monitoring
 */
export default function ReservationActionsWrapper({
  children,
  reservationId,
  currentStatus,
  showErrorBoundary = true
}: ReservationActionsWrapperProps) {
  return (
    <>
      {/* Network status indicator */}
      <NetworkStatusIndicator />
      
      {/* Error boundary for reservation actions */}
      {showErrorBoundary ? (
        <ReservationActionErrorHandler
          reservationId={reservationId}
          actionType="general"
          currentStatus={currentStatus}
          showInlineError={false}
        >
          {({ handleAction }) => (
            <div className="reservation-actions">
              {children}
            </div>
          )}
        </ReservationActionErrorHandler>
      ) : (
        <div className="reservation-actions">
          {children}
        </div>
      )}
    </>
  );
}

/**
 * Hook for handling reservation action errors with proper context
 */
export function useReservationAction(
  reservationId: string,
  actionType: 'check-in' | 'check-out' | 'cancel' | 'status-change' | 'payment' | 'consumption' | 'general',
  currentStatus: ReservationStatus,
  targetStatus?: ReservationStatus
) {
  // Use the hook from ReservationActionErrorHandler
  const { 
    isLoading, 
    error, 
    validationResult, 
    handleAction, 
    clearError, 
    showError 
  } = useReservationActionError(
    reservationId,
    actionType,
    currentStatus,
    targetStatus
  );

  // Wrap the action handler to provide more context
  const executeAction = async <T,>(
    action: () => Promise<T>,
    options?: { showErrorToast?: boolean }
  ): Promise<T | null> => {
    const result = await handleAction(action);
    
    // Show error toast if requested and there's an error
    if (options?.showErrorToast && (error || validationResult)) {
      showError();
    }
    
    return result;
  };

  return {
    isLoading,
    error,
    validationResult,
    executeAction,
    clearError
  };
}

// Import at the end to avoid circular dependencies
import { useReservationActionError } from '@/components/dashboard/ReservationActionErrorHandler';