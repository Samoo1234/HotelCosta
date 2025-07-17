'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { X, AlertTriangle, Calendar, Bed, DollarSign, User } from 'lucide-react';
import ErrorNotification from './ErrorNotification';
import { showErrorToast, showSuccessToast, showWarningToast } from './DetailedToast';

interface Guest {
  id: string;
  client_type: 'individual' | 'company';
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  trade_name: string | null;
}

interface Room {
  id: string;
  room_number: string;
  room_type: string;
}

interface Reservation {
  id: string;
  guest_id: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  guest: Guest;
  room: Room;
}

interface CancelReservationModalProps {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export default function CancelReservationModal({
  reservation,
  isOpen,
  onClose,
  onConfirm
}: CancelReservationModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const handleConfirm = async () => {
    // Reset validation error
    setValidationError(null);
    
    if (!reason.trim()) {
      setValidationError('Por favor, informe o motivo do cancelamento');
      return;
    }
    
    if (!confirmCancel) {
      setValidationError('Por favor, confirme que deseja cancelar a reserva');
      return;
    }
    
    setLoading(true);
    try {
      await onConfirm(reason);
      showSuccessToast(
        'Reserva cancelada',
        'Reserva cancelada com sucesso!',
        [
          `O quarto ${reservation.room.room_number} foi liberado para novas reservas`,
          'O hóspede será notificado sobre o cancelamento'
        ]
      );
      onClose();
    } catch (error: any) {
      console.error('Error:', error);
      showErrorToast(
        'Erro ao cancelar reserva',
        error.message || 'Ocorreu um erro ao cancelar a reserva',
        [
          'Verifique se a reserva está no status correto',
          'Verifique se há algum impedimento para o cancelamento',
          'Tente novamente em alguns instantes'
        ]
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to get guest name based on client type
  const getGuestName = (guest: Guest) => {
    return guest.client_type === 'individual'
      ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
      : guest.trade_name || guest.company_name || 'Empresa';
  };
  
  // Display guest name in the modal
  const guestName = getGuestName(reservation.guest);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <X className="h-5 w-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 ml-2">
            Cancelar Reserva
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Atenção!</p>
              <p className="text-red-700 text-sm mt-1">
                Esta ação não pode ser desfeita. O quarto será liberado para novas reservas e o hóspede será notificado do cancelamento.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start md:col-span-2">
                <User className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Hóspede</p>
                  <p className="font-medium text-gray-900">
                    {guestName}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Período</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(reservation.check_in_date)} - {formatDate(reservation.check_out_date)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Bed className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Quarto</p>
                  <p className="font-medium text-gray-900">
                    {reservation.room.room_number} - {reservation.room.room_type}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start md:col-span-2">
                <DollarSign className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Valor da Reserva</p>
                  <p className="font-medium text-gray-900">
                    R$ {reservation.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo do Cancelamento *
            </label>
            <select
              className="input-field w-full mb-3"
              value={reason === 'Outro' || reason === '' ? 'Outro' : reason}
              onChange={(e) => {
                if (e.target.value !== 'Outro') {
                  setReason(e.target.value);
                } else {
                  setReason('');
                }
              }}
              required
            >
              <option value="Outro">Selecione um motivo...</option>
              <option value="Solicitação do hóspede">Solicitação do hóspede</option>
              <option value="Erro na reserva">Erro na reserva</option>
              <option value="Indisponibilidade do quarto">Indisponibilidade do quarto</option>
              <option value="Problema de pagamento">Problema de pagamento</option>
              <option value="Outro">Outro motivo</option>
            </select>
            
            {(reason === '' || reason === 'Outro') && (
              <textarea
                className="input-field w-full"
                rows={3}
                value={reason === 'Outro' ? '' : reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo do cancelamento..."
                required
              />
            )}
          </div>
          
          <div className="mt-4">
            <label className="flex items-start">
              <input
                type="checkbox"
                className="mt-1 mr-2"
                checked={confirmCancel}
                onChange={(e) => setConfirmCancel(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Confirmo que desejo cancelar esta reserva e estou ciente de que esta ação não pode ser desfeita.
              </span>
            </label>
          </div>
          
          {/* Display validation error if any */}
          {validationError && (
            <div className="mt-4">
              <ErrorNotification
                type="error"
                title="Erro de validação"
                message={validationError}
                dismissible={false}
              />
            </div>
          )}
        </div>
        
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={loading}
          >
            Voltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !reason.trim() || !confirmCancel}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando...
              </div>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Confirmar Cancelamento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}