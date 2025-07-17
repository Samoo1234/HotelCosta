import { ReservationStatus } from '@/app/dashboard/reservations/[id]/details/actions';
import { LogCategory, logValidationError } from './logging';

// Interface for validation result
export interface ValidationResult {
  valid: boolean;
  message?: string;
  severity?: 'error' | 'warning' | 'info';
  suggestions?: string[];
}

// Interface for reservation data needed for validation
export interface ReservationValidationData {
  id: string;
  status: ReservationStatus;
  check_in_date: string;
  check_out_date: string;
  actual_check_in_date?: string;
  actual_check_out_date?: string;
  total_amount: number;
  guest_id: string;
  room_id: string;
  room?: {
    room_number: string;
    room_type: string;
    status: string;
  };
  guest?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  special_requests?: string;
  payment_status?: string;
}

// Interface for consumption data needed for validation
export interface ConsumptionValidationData {
  id: string;
  status: 'pending' | 'billed' | 'paid' | 'cancelled';
  total_amount: number;
  product: {
    name: string;
  };
}

/**
 * Define allowed status transitions
 * This maps each status to an array of statuses it can transition to
 */
export const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['checked_out', 'cancelled'],
  checked_out: [],
  cancelled: [],
  no_show: []
};

/**
 * Validates if a status transition is allowed based on the transition rules
 * @param currentStatus Current reservation status
 * @param newStatus Target reservation status
 * @returns Boolean indicating if the transition is allowed
 */
export function isValidStatusTransition(currentStatus: ReservationStatus, newStatus: ReservationStatus): boolean {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
}

/**
 * Gets a descriptive error message for an invalid status transition
 * @param currentStatus Current reservation status
 * @param newStatus Target reservation status
 * @returns Error message explaining why the transition is invalid
 */
export function getTransitionErrorMessage(currentStatus: ReservationStatus, newStatus: ReservationStatus): string {
  if (isValidStatusTransition(currentStatus, newStatus)) {
    return '';
  }
  
  // Specific error messages for common invalid transitions
  switch (currentStatus) {
    case 'confirmed':
      if (newStatus === 'checked_out') {
        return 'Não é possível realizar check-out sem antes fazer o check-in.';
      }
      break;
    case 'checked_in':
      if (newStatus === 'confirmed') {
        return 'Não é possível voltar ao status de confirmada após o check-in.';
      }
      if (newStatus === 'no_show') {
        return 'Não é possível marcar como no-show uma reserva que já teve check-in.';
      }
      break;
    case 'checked_out':
      return 'Esta reserva já foi finalizada e não pode ser alterada.';
    case 'cancelled':
      return 'Esta reserva foi cancelada e não pode ser alterada.';
    case 'no_show':
      return 'Esta reserva foi marcada como não compareceu e não pode ser alterada.';
  }
  
  return `Transição de status inválida: ${currentStatus} -> ${newStatus}`;
}

/**
 * Validates if a check-in operation can be performed
 * @param reservation The reservation data
 * @returns Validation result with status and message
 */
export function validateCheckIn(reservation: ReservationValidationData): ValidationResult {
  // Check if the reservation is in a valid status for check-in
  if (reservation.status !== 'confirmed') {
    const result: ValidationResult = {
      valid: false,
      message: `Não é possível realizar check-in para uma reserva com status "${reservation.status}". A reserva deve estar confirmada.`,
      severity: 'error'
    };
    
    // Log the validation error
    logValidationError(
      'check-in',
      {
        reservation_id: reservation.id,
        current_status: reservation.status,
        target_status: 'checked_in',
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }

  // Check if the room is available
  if (reservation.room?.status === 'occupied') {
    const result: ValidationResult = {
      valid: false,
      message: `O quarto ${reservation.room.room_number} está ocupado. Não é possível realizar check-in.`,
      severity: 'error',
      suggestions: [
        'Verifique se há outra reserva ativa para este quarto',
        'Atualize o status do quarto manualmente se necessário'
      ]
    };
    
    logValidationError(
      'check-in',
      {
        reservation_id: reservation.id,
        room_id: reservation.room_id,
        room_number: reservation.room.room_number,
        room_status: reservation.room.status,
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }

  // Check if the room is out of service
  if (reservation.room?.status === 'out_of_service') {
    const result: ValidationResult = {
      valid: false,
      message: `O quarto ${reservation.room.room_number} está fora de serviço. Não é possível realizar check-in.`,
      severity: 'error',
      suggestions: [
        'Verifique se o quarto está disponível para uso',
        'Considere trocar o quarto da reserva'
      ]
    };
    
    logValidationError(
      'check-in',
      {
        reservation_id: reservation.id,
        room_id: reservation.room_id,
        room_number: reservation.room.room_number,
        room_status: reservation.room.status,
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }

  // Check if the room is under maintenance
  if (reservation.room?.status === 'maintenance') {
    const result: ValidationResult = {
      valid: false,
      message: `O quarto ${reservation.room.room_number} está em manutenção. Não é possível realizar check-in.`,
      severity: 'error',
      suggestions: [
        'Verifique se a manutenção já foi concluída',
        'Considere trocar o quarto da reserva'
      ]
    };
    
    logValidationError(
      'check-in',
      {
        reservation_id: reservation.id,
        room_id: reservation.room_id,
        room_number: reservation.room.room_number,
        room_status: reservation.room.status,
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }

  // Check if the check-in date is in the future (more than 7 days)
  const checkInDate = new Date(reservation.check_in_date);
  const today = new Date();
  const daysDifference = Math.floor((today.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDifference < -7) {
    const result: ValidationResult = {
      valid: false,
      message: `O check-in está agendado para ${new Date(reservation.check_in_date).toLocaleDateString('pt-BR')}, que é mais de 7 dias no futuro. Não é possível realizar check-in com tanta antecedência.`,
      severity: 'error',
      suggestions: [
        'Ajuste a data da reserva se necessário',
        'Entre em contato com o hóspede para confirmar a nova data'
      ]
    };
    
    logValidationError(
      'check-in',
      {
        reservation_id: reservation.id,
        check_in_date: reservation.check_in_date,
        days_difference: daysDifference,
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }

  // Check if the check-in date is too far in the past (more than 3 days)
  if (daysDifference > 3) {
    const result: ValidationResult = {
      valid: false,
      message: `O check-in estava agendado para ${new Date(reservation.check_in_date).toLocaleDateString('pt-BR')}, que foi há mais de 3 dias. Considere marcar como no-show ou cancelar a reserva.`,
      severity: 'error',
      suggestions: [
        'Marque a reserva como no-show',
        'Cancele a reserva',
        'Entre em contato com o hóspede para verificar a situação'
      ]
    };
    
    logValidationError(
      'check-in',
      {
        reservation_id: reservation.id,
        check_in_date: reservation.check_in_date,
        days_difference: daysDifference,
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }

  // Warning for early check-in (not an error)
  if (daysDifference < -1) {
    return {
      valid: true,
      message: `O check-in está sendo realizado ${Math.abs(daysDifference)} dias antes da data prevista (${new Date(reservation.check_in_date).toLocaleDateString('pt-BR')}).`,
      severity: 'warning',
      suggestions: [
        'Verifique se há cobrança adicional para check-in antecipado',
        'Confirme a disponibilidade do quarto para o período adicional'
      ]
    };
  }

  // Warning for late check-in (not an error)
  if (daysDifference > 1) {
    return {
      valid: true,
      message: `O check-in está sendo realizado com ${daysDifference} dias de atraso em relação à data prevista (${new Date(reservation.check_in_date).toLocaleDateString('pt-BR')}).`,
      severity: 'warning',
      suggestions: [
        'Verifique se o período da reserva precisa ser ajustado',
        'Confirme a data de check-out com o hóspede'
      ]
    };
  }

  // If all checks pass, return valid
  return { valid: true };
}

/**
 * Validates if a check-out operation can be performed
 * @param reservation The reservation data
 * @param consumptions List of consumptions associated with the reservation
 * @returns Validation result with status and message
 */
export function validateCheckOut(
  reservation: ReservationValidationData, 
  consumptions: ConsumptionValidationData[]
): ValidationResult {
  // Check if the reservation is in a valid status for check-out
  if (reservation.status !== 'checked_in') {
    const result: ValidationResult = {
      valid: false,
      message: `Não é possível realizar check-out para uma reserva com status "${reservation.status}". A reserva deve ter check-in realizado.`,
      severity: 'error'
    };
    
    logValidationError(
      'check-out',
      {
        reservation_id: reservation.id,
        current_status: reservation.status,
        target_status: 'checked_out',
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }

  // Check if there are pending consumptions
  const pendingConsumptions = consumptions.filter(c => c.status === 'pending');
  if (pendingConsumptions.length > 0) {
    const result: ValidationResult = {
      valid: false,
      message: `Existem ${pendingConsumptions.length} consumo(s) pendente(s) que precisam ser finalizados antes do check-out.`,
      severity: 'error',
      suggestions: [
        'Finalize os consumos pendentes',
        'Verifique se todos os itens consumidos foram registrados'
      ]
    };
    
    logValidationError(
      'check-out',
      {
        reservation_id: reservation.id,
        pending_consumptions: pendingConsumptions.length,
        consumption_ids: pendingConsumptions.map(c => c.id),
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }

  // Check if the check-out date is in the future or past
  const checkOutDate = new Date(reservation.check_out_date);
  const today = new Date();
  const daysDifferenceCheckout = Math.floor((today.getTime() - checkOutDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Warning for early check-out (not an error)
  if (daysDifferenceCheckout < -1) {
    return {
      valid: true,
      message: `O check-out está sendo realizado ${Math.abs(daysDifferenceCheckout)} dias antes da data prevista (${new Date(reservation.check_out_date).toLocaleDateString('pt-BR')}). Verifique se há cobranças adicionais a serem aplicadas.`,
      severity: 'warning',
      suggestions: [
        'Verifique a política de check-out antecipado',
        'Ajuste o valor da reserva se necessário'
      ]
    };
  }

  // Warning for late check-out (not an error)
  if (daysDifferenceCheckout > 0) {
    return {
      valid: true,
      message: `O check-out está sendo realizado com ${daysDifferenceCheckout} dia(s) de atraso em relação à data prevista (${new Date(reservation.check_out_date).toLocaleDateString('pt-BR')}). Verifique se há cobranças adicionais a serem aplicadas.`,
      severity: 'warning',
      suggestions: [
        'Aplique a taxa de late check-out se aplicável',
        'Verifique se o quarto já está reservado para outro hóspede'
      ]
    };
  }

  // If all checks pass, return valid
  return { valid: true };
}

/**
 * Validates if a cancellation operation can be performed
 * @param reservation The reservation data
 * @returns Validation result with status and message
 */
export function validateCancellation(reservation: ReservationValidationData): ValidationResult {
  // Check if the reservation is in a valid status for cancellation
  if (reservation.status !== 'confirmed' && reservation.status !== 'checked_in') {
    const result: ValidationResult = {
      valid: false,
      message: `Não é possível cancelar uma reserva com status "${reservation.status}". A reserva deve estar confirmada ou com check-in realizado.`,
      severity: 'error'
    };
    
    logValidationError(
      'cancellation',
      {
        reservation_id: reservation.id,
        current_status: reservation.status,
        target_status: 'cancelled',
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }

  // Check if cancellation is being done after check-in
  if (reservation.status === 'checked_in') {
    return {
      valid: true,
      message: `Atenção: Esta reserva já teve check-in realizado. O cancelamento após check-in pode exigir procedimentos especiais de faturamento.`,
      severity: 'warning',
      suggestions: [
        'Verifique a política de cancelamento após check-in',
        'Considere aplicar taxas de cancelamento',
        'Verifique se há consumos a serem faturados'
      ]
    };
  }

  // Check if cancellation is being done after the check-in date for confirmed reservations
  if (reservation.status === 'confirmed') {
    const cancelCheckInDate = new Date(reservation.check_in_date);
    const today = new Date();
    
    if (today > cancelCheckInDate) {
      return {
        valid: true,
        message: `Esta reserva está sendo cancelada após a data de check-in prevista. Considere aplicar uma política de cancelamento tardio.`,
        severity: 'warning',
        suggestions: [
          'Verifique a política de cancelamento tardio',
          'Considere aplicar taxas de no-show',
          'Avalie se é mais adequado marcar como no-show em vez de cancelar'
        ]
      };
    }
  }

  // If all checks pass, return valid
  return { valid: true };
}

/**
 * Validates if a no-show operation can be performed
 * @param reservation The reservation data
 * @returns Validation result with status and message
 */
export function validateNoShow(reservation: ReservationValidationData): ValidationResult {
  // Check if the reservation is in a valid status for marking as no-show
  if (reservation.status !== 'confirmed') {
    const result: ValidationResult = {
      valid: false,
      message: `Não é possível marcar como no-show uma reserva com status "${reservation.status}". A reserva deve estar confirmada.`,
      severity: 'error'
    };
    
    logValidationError(
      'no-show',
      {
        reservation_id: reservation.id,
        current_status: reservation.status,
        target_status: 'no_show',
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }

  // Check if the current date is after the check-in date
  const noShowCheckInDate = new Date(reservation.check_in_date);
  const today = new Date();
  
  if (today < noShowCheckInDate) {
    const result: ValidationResult = {
      valid: false,
      message: `Não é possível marcar como no-show antes da data de check-in prevista (${new Date(reservation.check_in_date).toLocaleDateString('pt-BR')}).`,
      severity: 'error',
      suggestions: [
        'Aguarde até a data de check-in',
        'Se necessário, cancele a reserva em vez de marcá-la como no-show'
      ]
    };
    
    logValidationError(
      'no-show',
      {
        reservation_id: reservation.id,
        check_in_date: reservation.check_in_date,
        current_date: today.toISOString(),
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }

  // If the check-in date was more than 7 days ago, add a warning
  const daysSinceCheckIn = Math.floor((today.getTime() - noShowCheckInDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceCheckIn > 7) {
    return {
      valid: true,
      message: `A data de check-in foi há mais de ${daysSinceCheckIn} dias. Considere cancelar a reserva em vez de marcá-la como no-show.`,
      severity: 'warning',
      suggestions: [
        'Verifique se o hóspede fez contato',
        'Considere aplicar a política de no-show para liberar o quarto'
      ]
    };
  }

  // If all checks pass, return valid
  return { valid: true };
}

/**
 * Validates if consumptions can be finalized
 * @param consumptions List of consumptions associated with the reservation
 * @returns Validation result with status and message
 */
export function validateFinalizeConsumptions(consumptions: ConsumptionValidationData[]): ValidationResult {
  // Check if there are any consumptions
  if (!consumptions || consumptions.length === 0) {
    return {
      valid: false,
      message: `Não há consumos para finalizar.`,
      severity: 'info'
    };
  }

  // Check if there are any pending consumptions
  const pendingConsumptions = consumptions.filter(c => c.status === 'pending');
  if (pendingConsumptions.length === 0) {
    return {
      valid: false,
      message: `Não há consumos pendentes para finalizar. Todos os consumos já foram processados.`,
      severity: 'info'
    };
  }

  // If all checks pass, return valid with information about pending consumptions
  return { 
    valid: true,
    message: `${pendingConsumptions.length} consumo(s) pendente(s) serão finalizados.`,
    severity: 'info'
  };
}

/**
 * Comprehensive validation function that checks if a status transition is valid
 * @param currentStatus Current reservation status
 * @param newStatus Target reservation status
 * @param reservation Reservation data
 * @param consumptions List of consumptions (optional)
 * @returns Validation result with detailed information
 */
export function validateStatusTransition(
  currentStatus: ReservationStatus,
  newStatus: ReservationStatus,
  reservation: ReservationValidationData,
  consumptions: ConsumptionValidationData[] = []
): ValidationResult {
  // First check if the basic transition is allowed based on the status flow rules
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    const errorMessage = getTransitionErrorMessage(currentStatus, newStatus);
    const result: ValidationResult = {
      valid: false,
      message: errorMessage,
      severity: 'error',
      suggestions: [
        'Verifique o status atual da reserva',
        'Siga o fluxo correto de transições de status'
      ]
    };
    
    // Log the validation error
    logValidationError(
      'status-transition',
      {
        reservation_id: reservation.id,
        current_status: currentStatus,
        target_status: newStatus,
        error: errorMessage
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }

  // If the basic transition is valid, perform specific validations based on the target status
  switch (newStatus) {
    case 'checked_in':
      return validateCheckIn(reservation);
    case 'checked_out':
      return validateCheckOut(reservation, consumptions);
    case 'cancelled':
      return validateCancellation(reservation);
    case 'no_show':
      return validateNoShow(reservation);
    default:
      return { valid: true };
  }
}

/**
 * Validates if a reservation can be modified based on its current status
 * @param reservation The reservation data
 * @returns Validation result with status and message
 */
export function validateReservationModification(reservation: ReservationValidationData): ValidationResult {
  // Reservations that are checked-out, cancelled, or no-show cannot be modified
  if (['checked_out', 'cancelled', 'no_show'].includes(reservation.status)) {
    const statusMap: Record<string, string> = {
      'checked_out': 'finalizada (check-out)',
      'cancelled': 'cancelada',
      'no_show': 'marcada como não compareceu'
    };
    
    const statusText = statusMap[reservation.status] || reservation.status;
    
    const result: ValidationResult = {
      valid: false,
      message: `Esta reserva está ${statusText} e não pode ser modificada.`,
      severity: 'error'
    };
    
    logValidationError(
      'reservation-modification',
      {
        reservation_id: reservation.id,
        current_status: reservation.status,
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }
  
  // If the reservation has check-in, some fields may be restricted
  if (reservation.status === 'checked_in') {
    return {
      valid: true,
      message: 'Esta reserva já teve check-in realizado. Algumas informações não podem ser alteradas.',
      severity: 'warning',
      suggestions: [
        'Você pode modificar consumos e observações',
        'Para alterar datas ou quarto, considere cancelar e criar uma nova reserva'
      ]
    };
  }
  
  // If the reservation is confirmed, it can be fully modified
  return { valid: true };
}

/**
 * Validates if a payment can be processed for a reservation
 * @param reservation The reservation data
 * @param amount Payment amount
 * @returns Validation result with status and message
 */
export function validatePayment(
  reservation: ReservationValidationData, 
  amount: number
): ValidationResult {
  // Check if the reservation status allows payments
  if (!['confirmed', 'checked_in', 'checked_out'].includes(reservation.status)) {
    const result: ValidationResult = {
      valid: false,
      message: `Não é possível processar pagamentos para uma reserva com status "${reservation.status}".`,
      severity: 'error'
    };
    
    logValidationError(
      'payment',
      {
        reservation_id: reservation.id,
        current_status: reservation.status,
        amount,
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }
  
  // Check if the payment amount is valid
  if (amount <= 0) {
    const result: ValidationResult = {
      valid: false,
      message: 'O valor do pagamento deve ser maior que zero.',
      severity: 'error'
    };
    
    logValidationError(
      'payment',
      {
        reservation_id: reservation.id,
        amount,
        error: result.message
      },
      'reservation',
      reservation.id
    );
    
    return result;
  }
  
  // If all checks pass, return valid
  return { valid: true };
}