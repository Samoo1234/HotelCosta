import { LogIn, LogOut, X, ShoppingCart, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Reservation {
  id: string;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  check_in_date?: string;
  check_out_date?: string;
}

interface ReservationActionsProps {
  reservation: Reservation;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onCancel: () => void;
  onAddConsumption?: () => void;
  onFinalizeConsumptions?: () => void;
  hasUnpaidConsumptions: boolean;
  consumptions?: any[];
  isValidStatusTransition?: (currentStatus: string, newStatus: string) => boolean;
  getTransitionErrorMessage?: (currentStatus: string, newStatus: string) => string;
  validateStatusTransitionRequirements?: (currentStatus: string, newStatus: string, reservationData: any, consumptions?: any[]) => { valid: boolean; message?: string };
}

export default function ReservationActions({
  reservation,
  onCheckIn,
  onCheckOut,
  onCancel,
  onAddConsumption,
  onFinalizeConsumptions,
  hasUnpaidConsumptions,
  consumptions = [],
  isValidStatusTransition,
  getTransitionErrorMessage,
  validateStatusTransitionRequirements
}: ReservationActionsProps) {
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [transitionWarning, setTransitionWarning] = useState<string | null>(null);

  // Clear validation message when reservation status changes
  useEffect(() => {
    setValidationMessage(null);
    setTransitionWarning(null);
  }, [reservation.status]);

  // Function to validate status transitions before performing actions
  const validateTransition = (targetStatus: string) => {
    // If validation functions are not provided, allow the transition
    if (!isValidStatusTransition || !getTransitionErrorMessage || !validateStatusTransitionRequirements) {
      return true;
    }

    // Basic validation using the isValidStatusTransition function
    if (!isValidStatusTransition(reservation.status, targetStatus)) {
      const errorMessage = getTransitionErrorMessage(reservation.status, targetStatus);
      toast.error(errorMessage, { duration: 5000 });
      setValidationMessage(errorMessage);
      return false;
    }

    // Advanced validation using validateStatusTransitionRequirements
    const validationResult = validateStatusTransitionRequirements(
      reservation.status,
      targetStatus,
      reservation,
      consumptions
    );

    if (!validationResult.valid) {
      toast.error(validationResult.message || 'Transição de status inválida', { duration: 5000 });
      setValidationMessage(validationResult.message || null);
      return false;
    }

    // If there's a warning but the transition is valid, show it as a toast and store it
    if (validationResult.message && validationResult.valid) {
      setTransitionWarning(validationResult.message);
      toast.success(validationResult.message, { 
        icon: '⚠️',
        duration: 6000
      });
    } else {
      setTransitionWarning(null);
    }

    return true;
  };

  // Enhanced handlers with validation
  const handleCheckIn = () => {
    if (!validateStatusTransitionRequirements || validateTransition('checked_in')) {
      onCheckIn();
    }
  };

  const handleCheckOut = () => {
    // For check-out, we need to handle unpaid consumptions first
    if (hasUnpaidConsumptions) {
      const message = 'Existem consumos pendentes que precisam ser finalizados antes do check-out.';
      toast.error(message, { duration: 5000 });
      setValidationMessage(message);
      return;
    }

    if (!validateStatusTransitionRequirements || validateTransition('checked_out')) {
      onCheckOut();
    }
  };

  const handleCancel = () => {
    if (!validateStatusTransitionRequirements || validateTransition('cancelled')) {
      onCancel();
    }
  };

  return (
    <div className="space-y-2">
      {reservation.status === 'confirmed' && (
        <button
          onClick={handleCheckIn}
          className="btn-primary w-full flex items-center justify-center"
        >
          <LogIn className="h-4 w-4 mr-2" />
          Realizar Check-in
        </button>
      )}
      
      {reservation.status === 'checked_in' && (
        <>
          <button
            onClick={handleCheckOut}
            className="btn-primary w-full flex items-center justify-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Realizar Check-out
            {hasUnpaidConsumptions && (
              <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                Consumos Pendentes
              </span>
            )}
          </button>
          
          {onAddConsumption && (
            <button
              onClick={onAddConsumption}
              className="btn-secondary w-full flex items-center justify-center"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Adicionar Consumo
            </button>
          )}
          
          {hasUnpaidConsumptions && onFinalizeConsumptions && (
            <button
              onClick={onFinalizeConsumptions}
              className="btn-secondary w-full flex items-center justify-center text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
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
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar Reserva
        </button>
      )}
      
      {/* Display validation error messages if any */}
      {validationMessage && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertTriangle className="h-4 w-4 text-red-600 mr-2 mt-0.5" />
          <p className="text-sm text-red-800">
            {validationMessage}
          </p>
        </div>
      )}
      
      {/* Display transition warnings if any */}
      {transitionWarning && !validationMessage && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
          <p className="text-sm text-yellow-800">
            {transitionWarning}
          </p>
        </div>
      )}
      
      {/* Display warning for unpaid consumptions */}
      {reservation.status === 'checked_in' && hasUnpaidConsumptions && !validationMessage && !transitionWarning && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Esta reserva possui consumos pendentes que precisam ser finalizados antes do check-out.
          </p>
        </div>
      )}
    </div>
  );
}