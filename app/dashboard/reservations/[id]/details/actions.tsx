'use client';

import { createClient } from '@/lib/supabase-client';
import { getLocalISOString } from '@/lib/utils';
import { 
  validateStatusTransition, 
  validateCheckIn, 
  validateCheckOut, 
  validateCancellation, 
  validateNoShow,
  validateFinalizeConsumptions,
  ValidationResult
} from '@/lib/reservation-validations';
import {
  logReservationAction,
  logPaymentAction,
  logConsumptionAction,
  logValidationError,
  logSystemError,
  LogCategory
} from '@/lib/logging';

// Definição dos tipos de status de reserva
export type ReservationStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';

// Importar as transições de status permitidas do arquivo de validações
import { ALLOWED_TRANSITIONS } from '@/lib/reservation-validations';

// Definição de mensagens de status para feedback visual
export const STATUS_MESSAGES: Record<ReservationStatus, string> = {
  confirmed: 'Reserva confirmada',
  checked_in: 'Check-in realizado com sucesso',
  checked_out: 'Check-out realizado com sucesso',
  cancelled: 'Reserva cancelada',
  no_show: 'Reserva marcada como não compareceu'
};

// Definição de descrições detalhadas para cada status
export const STATUS_DESCRIPTIONS: Record<ReservationStatus, string> = {
  confirmed: 'A reserva está confirmada e aguardando check-in',
  checked_in: 'O hóspede realizou check-in e está hospedado',
  checked_out: 'O hóspede realizou check-out e a estadia foi finalizada',
  cancelled: 'A reserva foi cancelada',
  no_show: 'O hóspede não compareceu na data prevista'
};

// Função para validar transição de status
export function isValidStatusTransition(currentStatus: ReservationStatus, newStatus: ReservationStatus): boolean {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
}

// Função para obter mensagem de erro para transição inválida
export function getTransitionErrorMessage(currentStatus: ReservationStatus, newStatus: ReservationStatus): string {
  if (isValidStatusTransition(currentStatus, newStatus)) {
    return '';
  }
  
  // Mensagens específicas para cada tipo de transição inválida
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

// Função para verificar requisitos adicionais para transição de status
export function validateStatusTransitionRequirements(
  currentStatus: ReservationStatus, 
  newStatus: ReservationStatus,
  reservationData: any,
  consumptions?: any[]
): { valid: boolean; message?: string; severity?: 'error' | 'warning' | 'info'; suggestions?: string[] } {
  // Usar a função de validação abrangente do arquivo de validações
  const validationResult = validateStatusTransition(
    currentStatus,
    newStatus,
    reservationData,
    consumptions || []
  );
  
  // Retornar o resultado da validação
  return validationResult;
}

// Função para verificar se há alertas para uma transição válida
export function getTransitionWarning(
  currentStatus: ReservationStatus, 
  newStatus: ReservationStatus, 
  reservationData: { check_in_date: string; check_out_date: string }
): string | null {
  // Se a transição não é válida, não há alertas adicionais
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    return null;
  }
  
  const today = new Date();
  
  // Alertas específicos para cada tipo de transição
  if (newStatus === 'checked_in') {
    const checkInDate = new Date(reservationData.check_in_date);
    
    // Se a data de check-in for mais de 1 dia no futuro
    if (checkInDate.getTime() > today.getTime() + 24 * 60 * 60 * 1000) {
      return `O check-in está agendado para ${new Date(reservationData.check_in_date).toLocaleDateString('pt-BR')}. Deseja realizar o check-in antecipado?`;
    }
    
    // Se a data de check-in for mais de 1 dia no passado
    if (checkInDate.getTime() < today.getTime() - 24 * 60 * 60 * 1000) {
      return `O check-in estava agendado para ${new Date(reservationData.check_in_date).toLocaleDateString('pt-BR')}. Deseja realizar o check-in com atraso?`;
    }
  } 
  else if (newStatus === 'checked_out') {
    const checkOutDate = new Date(reservationData.check_out_date);
    
    // Se a data de check-out for mais de 1 dia no futuro
    if (checkOutDate.getTime() > today.getTime() + 24 * 60 * 60 * 1000) {
      return `O check-out está agendado para ${new Date(reservationData.check_out_date).toLocaleDateString('pt-BR')}. Realizar o check-out antecipado pode gerar cobranças adicionais.`;
    }
  }
  
  return null;
}

// Interface para o resultado da atualização de status
export interface StatusUpdateResult {
  success: boolean;
  previousStatus: ReservationStatus;
  newStatus: ReservationStatus;
  message?: string;
  roomStatus?: string;
  roomStatusMessage?: string;
  warnings?: string[];
  statusDescription?: string;
}

// Função para atualizar o status da reserva
export async function updateReservationStatus(
  reservationId: string, 
  newStatus: ReservationStatus, 
  additionalData: Record<string, any> = {},
  consumptions?: any[]
): Promise<StatusUpdateResult> {
  const supabase = createClient();
  const warnings: string[] = [];
  
  try {
    // Primeiro, obter o status atual da reserva com dados completos
    const { data: currentReservation, error: fetchError } = await supabase
      .from('reservations')
      .select('status, room_id, check_in_date, check_out_date, guest_id, total_amount, room:rooms!inner(room_number, room_type, status)')
      .eq('id', reservationId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const currentStatus = currentReservation.status as ReservationStatus;
    
    // Validar requisitos adicionais para a transição
    if (!consumptions && newStatus === 'checked_out') {
      // Se não foram fornecidos consumos, buscar do banco de dados
      const { data: fetchedConsumptions, error: consumptionsError } = await supabase
        .from('room_consumptions')
        .select('id, status, total_amount, product:products(name)')
        .eq('reservation_id', reservationId);
      
      if (consumptionsError) throw consumptionsError;
      consumptions = fetchedConsumptions;
    }
    
    // Criar objeto de validação com todas as propriedades necessárias
    const validationData = {
      id: reservationId,
      ...currentReservation,
      room: Array.isArray(currentReservation.room) ? currentReservation.room[0] : currentReservation.room
    };
    
    // Usar a nova função de validação abrangente
    const validationResult = validateStatusTransition(
      currentStatus, 
      newStatus, 
      validationData,
      consumptions
    );
    
    // Se a validação falhar, lançar erro
    if (!validationResult.valid) {
      throw new Error(validationResult.message);
    }
    
    // Se houver mensagem de aviso na validação, adicionar aos avisos
    if (validationResult.message && validationResult.severity !== 'error') {
      warnings.push(validationResult.message);
    }
    
    // Adicionar sugestões como avisos, se houver
    if (validationResult.suggestions && validationResult.suggestions.length > 0) {
      validationResult.suggestions.forEach(suggestion => {
        warnings.push(suggestion);
      });
    }
    
    // Preparar os dados para atualização
    const updateData: Record<string, any> = {
      status: newStatus,
      updated_at: getLocalISOString(),
      status_updated_at: getLocalISOString(),
      ...additionalData
    };
    
    // Adicionar campos específicos para cada tipo de transição
    switch (newStatus) {
      case 'checked_in':
        updateData.actual_check_in_date = getLocalISOString();
        break;
      case 'checked_out':
        updateData.actual_check_out_date = getLocalISOString();
        break;
      case 'cancelled':
        updateData.cancelled_at = getLocalISOString();
        break;
      case 'no_show':
        updateData.no_show_at = getLocalISOString();
        break;
    }
    
    // Atualizar o status da reserva
    const { error: updateError } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', reservationId);
    
    if (updateError) throw updateError;
    
    // Atualizar o status do quarto com base no novo status da reserva
    let roomStatus;
    let roomStatusMessage = '';
    const room = Array.isArray(currentReservation.room) ? currentReservation.room[0] : currentReservation.room;
    const roomNumber = room?.room_number;
    
    switch (newStatus) {
      case 'checked_in':
        roomStatus = 'occupied';
        roomStatusMessage = roomNumber ? `Quarto ${roomNumber} marcado como ocupado` : 'Quarto marcado como ocupado';
        break;
      case 'checked_out':
        roomStatus = 'available';
        roomStatusMessage = roomNumber ? `Quarto ${roomNumber} liberado para novas reservas` : 'Quarto liberado para novas reservas';
        break;
      case 'cancelled':
        roomStatus = 'available';
        roomStatusMessage = roomNumber ? `Quarto ${roomNumber} liberado para novas reservas` : 'Quarto liberado para novas reservas';
        break;
      case 'no_show':
        roomStatus = 'available';
        roomStatusMessage = roomNumber ? `Quarto ${roomNumber} liberado para novas reservas` : 'Quarto liberado para novas reservas';
        break;
      default:
        // Não alterar o status do quarto para outros status de reserva
        break;
    }
    
    // Atualizar o status do quarto
    if (roomStatus) {
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ 
          status: roomStatus,
          updated_at: getLocalISOString()
        })
        .eq('id', currentReservation.room_id);
      
      if (roomError) throw roomError;
      
      // Adicionar mensagem sobre a atualização do quarto aos avisos
      if (roomStatusMessage) {
        warnings.push(roomStatusMessage);
      }
    }
    
    // Registrar log de atividade com detalhes adicionais usando nossa nova função de logging
    const logDetails = {
      previous_status: currentStatus,
      new_status: newStatus,
      warnings: warnings.length > 0 ? warnings : undefined,
      room_id: currentReservation.room_id,
      guest_id: currentReservation.guest_id,
      check_in_date: currentReservation.check_in_date,
      check_out_date: currentReservation.check_out_date,
      room_status: roomStatus,
      room_number: room?.room_number,
      ...additionalData
    };
    
    // Registrar log no sistema de logs detalhados
    await logReservationAction(
      `status_change_${newStatus}`,
      reservationId,
      logDetails,
      true
    );
    
    // Manter o log no sistema atual para compatibilidade
    await supabase
      .from('activity_logs')
      .insert({
        action_type: `status_change_${newStatus}`,
        entity_type: 'reservation',
        entity_id: reservationId,
        details: logDetails,
        created_at: getLocalISOString()
      });
    
    return {
      success: true,
      previousStatus: currentStatus,
      newStatus: newStatus,
      message: STATUS_MESSAGES[newStatus],
      statusDescription: STATUS_DESCRIPTIONS[newStatus],
      roomStatus,
      roomStatusMessage,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error: any) {
    console.error('Error updating reservation status:', error);
    
    // Log the error with our detailed logging system
    await logSystemError(
      error,
      'updateReservationStatus',
      {
        reservationId,
        newStatus,
        additionalData
      }
    );
    
    throw error;
  }
}

// Função para realizar check-in
export async function performCheckIn(reservationId: string): Promise<StatusUpdateResult> {
  try {
    // Usar a função aprimorada de atualização de status
    const result = await updateReservationStatus(reservationId, 'checked_in');
    
    // Retornar o resultado completo da função de atualização
    return result;
  } catch (error: any) {
    console.error('Error performing check-in:', error);
    
    // Log the error with our detailed logging system
    await logSystemError(
      error,
      'performCheckIn',
      {
        reservationId
      }
    );
    
    throw error;
  }
}

// Função para realizar check-out
export async function performCheckOut(reservationId: string, consumptions: any[], paymentMethod: string = 'credit_card') {
  const supabase = createClient();
  
  try {
    // Calcular o valor total (reserva + consumos)
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('total_amount, guest_id, status, room_id, check_in_date, check_out_date')
      .eq('id', reservationId)
      .single();
    
    if (reservationError) throw reservationError;
    
    // Verificar se há consumos pendentes usando a nova função de validação
    const reservationWithId = { ...reservation, id: reservationId };
    const validationResult = validateCheckOut(reservationWithId, consumptions);
    
    if (!validationResult.valid) {
      throw new Error(validationResult.message);
    }
    
    // Calcular o valor total (estadia + consumos)
    const totalAmount = reservation.total_amount + consumptions.reduce((sum, c) => sum + c.total_amount, 0);
    
    // Calcular a duração da estadia em dias
    const checkInDate = new Date(reservation.check_in_date);
    const checkOutDate = new Date(reservation.check_out_date);
    const stayDuration = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Criar pagamento com informações detalhadas
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        reservation_id: reservationId,
        guest_id: reservation.guest_id,
        amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: 'completed',
        payment_date: getLocalISOString(),
        description: `Pagamento de check-out - Reserva #${reservationId.slice(-8)}`,
        details: {
          stay_amount: reservation.total_amount,
          consumption_amount: consumptions.reduce((sum, c) => sum + c.total_amount, 0),
          stay_duration: stayDuration,
          payment_method_details: {
            type: paymentMethod,
            processed_at: getLocalISOString()
          },
          consumptions_count: consumptions.length
        }
      })
      .select();
    
    if (paymentError) throw paymentError;
    
    // Atualizar status dos consumos para 'paid'
    if (consumptions.length > 0) {
      const { error: consumptionsError } = await supabase
        .from('room_consumptions')
        .update({ 
          status: 'paid',
          payment_id: paymentData[0].id,
          updated_at: getLocalISOString()
        })
        .eq('reservation_id', reservationId);
      
      if (consumptionsError) throw consumptionsError;
    }
    
    // Registrar log de pagamento com detalhes adicionais usando nossa nova função de logging
    const paymentDetails = {
      payment_id: paymentData[0].id,
      payment_method: paymentMethod,
      total_amount: totalAmount,
      stay_amount: reservation.total_amount,
      consumption_amount: consumptions.reduce((sum, c) => sum + c.total_amount, 0),
      stay_duration: stayDuration,
      check_in_date: reservation.check_in_date,
      check_out_date: reservation.check_out_date,
      actual_check_out_date: getLocalISOString()
    };
    
    // Registrar log no sistema de logs detalhados
    await logPaymentAction(
      'payment_processed',
      paymentData[0].id,
      reservationId,
      paymentDetails,
      true
    );
    
    // Manter o log no sistema atual para compatibilidade
    await supabase
      .from('activity_logs')
      .insert({
        action_type: 'payment_processed',
        entity_type: 'reservation',
        entity_id: reservationId,
        details: paymentDetails,
        created_at: getLocalISOString()
      });
    
    // Atualizar status da reserva com informações adicionais de pagamento
    // Usar a função aprimorada que já inclui validações e logs detalhados
    const statusResult = await updateReservationStatus(
      reservationId, 
      'checked_out', 
      {
        payment_status: 'paid',
        payment_id: paymentData[0].id,
        payment_method: paymentMethod,
        payment_amount: totalAmount,
        actual_check_out_date: getLocalISOString(),
        stay_duration: stayDuration
      },
      consumptions
    );
    
    // Retornar resultado combinado com informações detalhadas
    return {
      ...statusResult,
      payment_id: paymentData[0].id,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      stay_duration: stayDuration,
      stay_amount: reservation.total_amount,
      consumption_amount: consumptions.reduce((sum, c) => sum + c.total_amount, 0),
      consumptions_count: consumptions.length
    };
  } catch (error: any) {
    console.error('Error performing check-out:', error);
    
    // Log the error with our detailed logging system
    await logSystemError(
      error,
      'performCheckOut',
      {
        reservationId,
        paymentMethod,
        consumptionsCount: consumptions?.length || 0
      }
    );
    
    throw error;
  }
}

// Função para cancelar reserva
export async function cancelReservation(reservationId: string, reason: string): Promise<StatusUpdateResult> {
  const supabase = createClient();
  
  try {
    // Obter os dados atuais da reserva com mais detalhes
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('special_requests, status, check_in_date, check_out_date, guest_id, room_id, total_amount')
      .eq('id', reservationId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Usar a nova função de validação para verificar requisitos específicos
    const reservationWithId = { ...reservation, id: reservationId };
    const validationResult = validateCancellation(reservationWithId);
    
    if (!validationResult.valid) {
      throw new Error(validationResult.message);
    }
    
    // Adicionar o motivo do cancelamento às solicitações especiais
    const specialRequests = reservation.special_requests 
      ? `${reservation.special_requests}\n\nMotivo do cancelamento: ${reason}`
      : `Motivo do cancelamento: ${reason}`;
    
    // Preparar dados adicionais para o cancelamento
    const additionalData = {
      special_requests: specialRequests,
      cancellation_reason: reason,
      cancellation_date: getLocalISOString()
    };
    
    // Se houver mensagem de aviso na validação, registrar como aviso
    const warnings = [];
    if (validationResult.message) {
      warnings.push(validationResult.message);
    }
    
    // Atualizar o status da reserva com o motivo do cancelamento
    // Usar a função aprimorada que já inclui validações e logs detalhados
    const statusResult = await updateReservationStatus(
      reservationId, 
      'cancelled', 
      additionalData
    );
    
    // Registrar log específico de cancelamento com detalhes adicionais
    const cancellationDetails = {
      reason: reason,
      previous_status: reservation.status,
      cancellation_date: getLocalISOString(),
      check_in_date: reservation.check_in_date,
      check_out_date: reservation.check_out_date,
      warnings: warnings.length > 0 ? warnings : undefined
    };
    
    // Registrar log no sistema de logs detalhados
    await logReservationAction(
      'reservation_cancelled',
      reservationId,
      cancellationDetails,
      true
    );
    
    // Manter o log no sistema atual para compatibilidade
    await supabase
      .from('activity_logs')
      .insert({
        action_type: 'reservation_cancelled',
        entity_type: 'reservation',
        entity_id: reservationId,
        details: cancellationDetails,
        created_at: getLocalISOString()
      });
    
    // Retornar o resultado da atualização de status
    return statusResult;
  } catch (error: any) {
    console.error('Error cancelling reservation:', error);
    
    // Log the error with our detailed logging system
    await logSystemError(
      error,
      'cancelReservation',
      {
        reservationId,
        reason
      }
    );
    
    throw error;
  }
}

// Interface para o resultado da finalização de consumos
export interface ConsumptionsResult {
  success: boolean;
  message: string;
  updatedCount: number;
}

// Função para finalizar consumos
export async function finalizeConsumptions(reservationId: string): Promise<ConsumptionsResult> {
  const supabase = createClient();
  
  try {
    // Primeiro, buscar todos os consumos para validação
    const { data: consumptions, error: checkError } = await supabase
      .from('room_consumptions')
      .select('id, status, total_amount, product:products!inner(name)')
      .eq('reservation_id', reservationId);
    
    if (checkError) throw checkError;
    
    // Usar a nova função de validação para verificar se há consumos pendentes
    const consumptionsWithCorrectType = (consumptions || []).map(consumption => ({
      ...consumption,
      product: Array.isArray(consumption.product) ? consumption.product[0] : consumption.product
    })) as any[];
    const validationResult = validateFinalizeConsumptions(consumptionsWithCorrectType);
    
    // Se não houver consumos pendentes, retornar uma mensagem informativa
    if (!validationResult.valid) {
      return {
        success: true,
        message: validationResult.message || 'Não há consumos pendentes para finalizar.',
        updatedCount: 0
      };
    }
    
    // Filtrar apenas os consumos pendentes
    const pendingConsumptions = consumptions?.filter(c => c.status === 'pending') || [];
    
    // Atualizar os consumos pendentes para faturados
    const { error } = await supabase
      .from('room_consumptions')
      .update({ 
        status: 'billed',
        updated_at: getLocalISOString()
      })
      .eq('reservation_id', reservationId)
      .eq('status', 'pending');
    
    if (error) throw error;
    
    // Registrar log de atividade usando nossa nova função de logging
    const consumptionDetails = {
      updated_count: pendingConsumptions.length,
      consumption_ids: pendingConsumptions.map(c => c.id),
      total_amount: pendingConsumptions.reduce((sum, c) => sum + (c.total_amount || 0), 0)
    };
    
    // Registrar log no sistema de logs detalhados
    await logConsumptionAction(
      'finalize_consumptions',
      pendingConsumptions.map(c => c.id),
      reservationId,
      consumptionDetails,
      true
    );
    
    // Manter o log no sistema atual para compatibilidade
    await supabase
      .from('activity_logs')
      .insert({
        action_type: 'finalize_consumptions',
        entity_type: 'reservation',
        entity_id: reservationId,
        details: {
          updated_count: pendingConsumptions.length
        },
        created_at: getLocalISOString()
      });
    
    return {
      success: true,
      message: `${pendingConsumptions.length} consumo(s) finalizado(s) com sucesso.`,
      updatedCount: pendingConsumptions.length
    };
  } catch (error: any) {
    console.error('Error finalizing consumptions:', error);
    
    // Log the error with our detailed logging system
    await logSystemError(
      error,
      'finalizeConsumptions',
      {
        reservationId,
        pendingConsumptionsCount: 0
      }
    );
    
    throw error;
  }
}

// Função para verificar se há consumos pendentes
export async function hasUnpaidConsumptions(reservationId: string): Promise<boolean> {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('room_consumptions')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('status', 'pending');
    
    if (error) throw error;
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking unpaid consumptions:', error);
    return false;
  }
}