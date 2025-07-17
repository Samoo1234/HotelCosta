'use client';

import { useRouter } from 'next/navigation';
import { LogIn, LogOut, X, ShoppingCart, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  isValidStatusTransition,
  getTransitionErrorMessage,
  ReservationStatus,
  updateReservationStatus
} from './actions';
import { 
  validateStatusTransition, 
  validateCheckIn, 
  validateCheckOut, 
  validateCancellation, 
  validateNoShow,
  ValidationResult
} from '@/lib/reservation-validations';
import { 
  showDetailedToast, 
  showErrorToast, 
  showWarningToast, 
  showInfoToast, 
  showSuccessToast 
} from '@/components/dashboard/DetailedToast';
import ErrorNotification from '@/components/dashboard/ErrorNotification';

// Define types for the component props
interface Reservation {
  id: string;
  status: ReservationStatus;
  check_in_date: string;
  check_out_date: string;
  room?: {
    room_number: string;
  };
}

interface ReservationActionButtonsProps {
  reservation: Reservation;
  hasUnpaidConsumptions: boolean;
  setShowCheckInModal: (show: boolean) => void;
  setShowCheckOutModal: (show: boolean) => void;
  setShowCancelModal: (show: boolean) => void;
  onFinalizeConsumptions: () => Promise<boolean>;
  onReload?: () => Promise<void>;
  consumptions?: any[];
}

export default function ReservationActionButtons({
  reservation,
  hasUnpaidConsumptions,
  setShowCheckInModal,
  setShowCheckOutModal,
  setShowCancelModal,
  onFinalizeConsumptions,
  onReload,
  consumptions = []
}: ReservationActionButtonsProps) {
  const router = useRouter();
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [transitionWarning, setTransitionWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Clear validation message when reservation status changes
  useEffect(() => {
    setValidationMessage(null);
    setTransitionWarning(null);
  }, [reservation.status]);

  const handleAddConsumption = () => {
    router.push(`/dashboard/consumptions/new?reservation_id=${reservation.id}`);
  };

  // Function to validate status transitions before showing modals
  const validateTransition = (targetStatus: ReservationStatus) => {
    // Create validation data object with required properties
    const validationData = {
      id: reservation.id,
      status: reservation.status,
      check_in_date: reservation.check_in_date,
      check_out_date: reservation.check_out_date,
      actual_check_in_date: (reservation as any).actual_check_in_date,
      actual_check_out_date: (reservation as any).actual_check_out_date,
      total_amount: (reservation as any).total_amount || 0,
      guest_id: (reservation as any).guest_id || (reservation as any).guest?.id || '',
      room_id: (reservation as any).room_id || (reservation as any).room?.id || '',
      room: (reservation as any).room,
      guest: (reservation as any).guest,
      special_requests: (reservation as any).special_requests,
      payment_status: (reservation as any).payment_status
    };
    
    // Use our new comprehensive validation function
    const validationResult = validateStatusTransition(
      reservation.status,
      targetStatus,
      validationData,
      consumptions
    );

    // Handle validation result based on severity
    if (!validationResult.valid) {
      // Use our new detailed error toast
      showErrorToast(
        'Transição de status inválida',
        validationResult.message || 'Não é possível realizar esta transição de status',
        validationResult.suggestions
      );
      setValidationMessage(validationResult.message || null);
      return false;
    }

    // Clear previous validation error messages
    setValidationMessage(null);

    // Handle warnings if present
    if (validationResult.message && validationResult.severity === 'warning') {
      setTransitionWarning(validationResult.message);
      // Show warning with our new detailed toast
      showWarningToast(
        'Atenção',
        validationResult.message,
        validationResult.suggestions
      );
    } else {
      setTransitionWarning(null);
    }

    // Show info toast if there's a message with info severity
    if (validationResult.message && validationResult.severity === 'info') {
      showInfoToast(
        'Informação',
        validationResult.message,
        validationResult.suggestions
      );
    }

    // Show a confirmation message about the transition
    const statusIcons = {
      'checked_in': '✅',
      'checked_out': '🏁',
      'cancelled': '❌',
      'no_show': '⚠️',
      'confirmed': '📅'
    };

    const transitionMessages = {
      'checked_in': 'Iniciando processo de check-in...',
      'checked_out': 'Iniciando processo de check-out...',
      'cancelled': 'Iniciando processo de cancelamento...',
      'no_show': 'Marcando reserva como não compareceu...',
      'confirmed': 'Confirmando reserva...'
    };

    toast.success(transitionMessages[targetStatus] || `Alterando status para ${targetStatus}...`, {
      icon: statusIcons[targetStatus] || '✓',
      duration: 3000
    });

    return true;
  };

  // Direct status update function (for quick actions without modal)
  const handleDirectStatusUpdate = async (targetStatus: ReservationStatus, additionalData: Record<string, any> = {}) => {
    if (!validateTransition(targetStatus)) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateReservationStatus(
        reservation.id,
        targetStatus,
        additionalData,
        consumptions
      );

      // Show success message with appropriate icon based on status
      const statusIcons = {
        'checked_in': '✅',
        'checked_out': '🏁',
        'cancelled': '❌',
        'no_show': '⚠️',
        'confirmed': '📅'
      };

      const icon = statusIcons[targetStatus] || '✓';
      toast.success(result.message || `Status alterado para ${targetStatus} com sucesso!`, {
        icon,
        duration: 5000
      });

      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          // Don't show room status message as a warning since we'll show it separately
          if (!warning.includes('Quarto') || !result.roomStatusMessage) {
            toast.success(warning, {
              icon: '⚠️',
              duration: 6000
            });
          }
        });
      }

      // Show room status update if applicable
      if (result.roomStatus && reservation.room) {
        const statusMessage = result.roomStatusMessage || (
          result.roomStatus === 'occupied'
            ? `Quarto ${reservation.room.room_number} marcado como ocupado`
            : `Quarto ${reservation.room.room_number} liberado para novas reservas`
        );

        toast.success(statusMessage, {
          duration: 4000,
          icon: result.roomStatus === 'occupied' ? '🔑' : '🏠'
        });
      }

      // Clear any validation messages
      setValidationMessage(null);
      setTransitionWarning(null);

      // Reload data if callback provided
      if (onReload) {
        await onReload();
      }
    } catch (error: any) {
      console.error(`Error updating status to ${targetStatus}:`, error);
      toast.error(`Erro ao atualizar status: ${error.message || 'Erro desconhecido'}`, {
        duration: 5000
      });

      // Set validation message for display in the UI
      setValidationMessage(error.message || `Erro ao atualizar status para ${targetStatus}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced handlers with validation
  const handleCheckIn = () => {
    if (validateTransition('checked_in')) {
      setShowCheckInModal(true);
    }
  };

  const handleCheckOut = async () => {
    // For check-out, we need to handle unpaid consumptions
    if (hasUnpaidConsumptions) {
      toast.error('Existem consumos pendentes que precisam ser finalizados antes do check-out.', {
        duration: 5000
      });
      setValidationMessage('Existem consumos pendentes que precisam ser finalizados antes do check-out.');
      return;
    }

    if (validateTransition('checked_out')) {
      setShowCheckOutModal(true);
    }
  };

  const handleCancel = () => {
    if (validateTransition('cancelled')) {
      setShowCancelModal(true);
    }
  };

  // Handle no-show status (direct update without modal)
  const handleNoShow = async () => {
    await handleDirectStatusUpdate('no_show', {
      no_show_reason: 'Hóspede não compareceu na data prevista'
    });
  };

  return (
    <div className="space-y-2">
      {reservation.status === 'confirmed' && (
        <>
          <button
            onClick={handleCheckIn}
            className="btn-primary w-full flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando...
              </div>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Realizar Check-in
              </>
            )}
          </button>

          <button
            onClick={handleNoShow}
            className="btn-secondary w-full flex items-center justify-center text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            disabled={isLoading}
          >
            <Info className="h-4 w-4 mr-2" />
            Marcar como No-show
          </button>
        </>
      )}

      {reservation.status === 'checked_in' && (
        <>
          <button
            onClick={handleCheckOut}
            className="btn-primary w-full flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando...
              </div>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Realizar Check-out
                {hasUnpaidConsumptions && (
                  <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Consumos Pendentes
                  </span>
                )}
              </>
            )}
          </button>

          <button
            onClick={handleAddConsumption}
            className="btn-secondary w-full flex items-center justify-center"
            disabled={isLoading}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Adicionar Consumo
          </button>

          {hasUnpaidConsumptions && (
            <button
              onClick={onFinalizeConsumptions}
              className="btn-secondary w-full flex items-center justify-center text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
              disabled={isLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalizar Consumos
            </button>
          )}
        </>
      )}

      {(reservation.status === 'confirmed' || reservation.status === 'checked_in') && (
        <button
          onClick={handleCancel}
          className="btn-outline text-red-600 hover:bg-red-50 w-full flex items-center justify-center"
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar Reserva
        </button>
      )}

      {/* Display validation error messages if any */}
      {validationMessage && (
        <div className="mt-4">
          <ErrorNotification
            type="error"
            title="Erro de validação"
            message={validationMessage}
            dismissible={false}
          />
        </div>
      )}

      {/* Display transition warnings if any */}
      {transitionWarning && !validationMessage && (
        <div className="mt-4">
          <ErrorNotification
            type="warning"
            title="Atenção"
            message={transitionWarning}
            dismissible={false}
          />
        </div>
      )}

      {/* Display warning for unpaid consumptions */}
      {reservation.status === 'checked_in' && hasUnpaidConsumptions && !validationMessage && !transitionWarning && (
        <div className="mt-4">
          <ErrorNotification
            type="warning"
            title="Consumos pendentes"
            message="Esta reserva possui consumos pendentes que precisam ser finalizados antes do check-out."
            suggestions={[
              "Clique em 'Finalizar Consumos' para processar os itens pendentes",
              "Verifique se todos os consumos foram registrados corretamente"
            ]}
            dismissible={false}
          />
        </div>
      )}
    </div>
  );
}