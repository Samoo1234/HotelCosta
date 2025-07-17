'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';
import ErrorNotification from './ErrorNotification';
import { showErrorToast } from './DetailedToast';

interface Guest {
  id: string;
  client_type: 'individual' | 'company';
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  trade_name: string | null;
  email: string;
  phone: string;
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
  guest: Guest;
  room: Room;
}

interface CheckInModalProps {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function CheckInModal({
  reservation,
  isOpen,
  onClose,
  onConfirm
}: CheckInModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmIdentity, setConfirmIdentity] = useState(false);
  const [confirmRules, setConfirmRules] = useState(false);
  const [confirmPayment, setConfirmPayment] = useState(false);
  
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const handleConfirm = async () => {
    // Reset validation error
    setValidationError(null);
    
    if (!confirmIdentity || !confirmRules || !confirmPayment) {
      setValidationError('Por favor, confirme todos os itens antes de prosseguir');
      return;
    }
    
    setLoading(true);
    try {
      await onConfirm();
      toast.success('Check-in realizado com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('Error:', error);
      showErrorToast(
        'Erro ao realizar check-in',
        error.message || 'Ocorreu um erro ao processar o check-in',
        [
          'Verifique se a reserva está no status correto',
          'Verifique se o quarto está disponível',
          'Tente novamente em alguns instantes'
        ]
      );
    } finally {
      setLoading(false);
    }
  };
  
  const getGuestName = (guest: Guest) => {
    return guest.client_type === 'individual'
      ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
      : guest.trade_name || guest.company_name || 'Empresa';
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <LogIn className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 ml-2">
            Realizar Check-in
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 text-sm">
              Confirme os dados do hóspede e da reserva antes de prosseguir com o check-in.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Hóspede</p>
              <p className="font-medium text-gray-900">
                {getGuestName(reservation.guest)}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Contato</p>
              <p className="font-medium text-gray-900">
                {reservation.guest.email || 'Não informado'}
                {reservation.guest.phone && <span> / {reservation.guest.phone}</span>}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Quarto</p>
              <p className="font-medium text-gray-900">
                {reservation.room.room_number} - {reservation.room.room_type}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Período</p>
              <p className="font-medium text-gray-900">
                {formatDate(reservation.check_in_date)} - {formatDate(reservation.check_out_date)}
              </p>
            </div>
          </div>
          
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Confirmações</h4>
            
            <div className="space-y-3">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  className="mt-1 mr-2"
                  checked={confirmIdentity}
                  onChange={(e) => setConfirmIdentity(e.target.checked)}
                />
                <span className="text-sm text-gray-700">
                  Confirmo que verifiquei a identidade do hóspede e os dados da reserva estão corretos.
                </span>
              </label>
              
              <label className="flex items-start">
                <input
                  type="checkbox"
                  className="mt-1 mr-2"
                  checked={confirmPayment}
                  onChange={(e) => setConfirmPayment(e.target.checked)}
                />
                <span className="text-sm text-gray-700">
                  Confirmo que verifiquei o pagamento da reserva ou garantia de pagamento.
                </span>
              </label>
              
              <label className="flex items-start">
                <input
                  type="checkbox"
                  className="mt-1 mr-2"
                  checked={confirmRules}
                  onChange={(e) => setConfirmRules(e.target.checked)}
                />
                <span className="text-sm text-gray-700">
                  Confirmo que informei ao hóspede sobre as regras do hotel, horários e serviços disponíveis.
                </span>
              </label>
            </div>
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
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !confirmIdentity || !confirmRules || !confirmPayment}
            className="btn-primary"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando...
              </div>
            ) : (
              'Confirmar Check-in'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}