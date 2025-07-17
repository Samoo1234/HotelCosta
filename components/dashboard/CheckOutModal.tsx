'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import CheckoutSummary from './CheckoutSummary';
import { LogOut, AlertTriangle, CheckCircle, CreditCard, DollarSign, Smartphone, Banknote } from 'lucide-react';
import { formatDate } from '@/lib/utils';
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

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
}

interface RoomConsumption {
  id: string;
  reservation_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  consumption_date: string;
  status: 'pending' | 'billed' | 'paid' | 'cancelled';
  product: Product;
}

interface CheckOutModalProps {
  reservation: Reservation;
  consumptions: RoomConsumption[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onFinalizeConsumptions: () => Promise<void>;
}

export default function CheckOutModal({
  reservation,
  consumptions,
  isOpen,
  onClose,
  onConfirm,
  onFinalizeConsumptions
}: CheckOutModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [confirmCheckout, setConfirmCheckout] = useState(false);
  const hasUnpaidConsumptions = consumptions.some(c => c.status === 'pending');
  
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const handleConfirm = async () => {
    // Reset validation error
    setValidationError(null);
    
    if (!confirmCheckout) {
      setValidationError('Por favor, confirme que o hóspede está ciente do valor total');
      return;
    }
    
    setLoading(true);
    try {
      // Verificar se há consumos pendentes antes de prosseguir
      if (hasUnpaidConsumptions) {
        const consumptionsResult = await handleFinalizeConsumptions();
        if (!consumptionsResult) {
          showErrorToast(
            'Erro ao finalizar consumos',
            'Não foi possível finalizar os consumos pendentes',
            [
              'Verifique se todos os consumos estão registrados corretamente',
              'Tente novamente em alguns instantes'
            ]
          );
          setLoading(false);
          return;
        }
      }
      
      // Calcular o valor total para exibição
      const totalAmount = reservation.total_amount + consumptions.reduce((sum, c) => sum + c.total_amount, 0);
      
      // Realizar o check-out
      await onConfirm();
      
      // Mostrar mensagem de sucesso com detalhes do pagamento usando nosso novo componente
      showSuccessToast(
        'Check-out realizado',
        'Check-out realizado com sucesso!',
        ['O quarto está agora disponível para novas reservas']
      );
      
      // Mostrar detalhes do pagamento
      showSuccessToast(
        'Pagamento registrado',
        `Pagamento de R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} processado com sucesso`,
        [
          `Método: ${paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 
                   paymentMethod === 'debit_card' ? 'Cartão de Débito' : 
                   paymentMethod === 'cash' ? 'Dinheiro' : 'PIX'}`,
          `Quarto ${reservation.room.room_number} liberado para novas reservas`
        ]
      );
      
      onClose();
    } catch (error: any) {
      console.error('Error:', error);
      showErrorToast(
        'Erro ao realizar check-out',
        error.message || 'Ocorreu um erro desconhecido ao processar o check-out',
        [
          'Verifique se todos os consumos foram finalizados',
          'Verifique se a reserva está no status correto',
          'Tente novamente em alguns instantes'
        ]
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleFinalizeConsumptions = async () => {
    setLoading(true);
    try {
      await onFinalizeConsumptions();
      showSuccessToast(
        'Consumos finalizados',
        'Todos os consumos foram finalizados com sucesso',
        [
          'Os consumos foram marcados como faturados',
          'Agora é possível prosseguir com o check-out',
          'Verifique o valor total na próxima etapa'
        ]
      );
      setStep(2);
      return true;
    } catch (error: any) {
      console.error('Error:', error);
      showErrorToast(
        'Erro ao finalizar consumos',
        error.message || 'Ocorreu um erro ao finalizar os consumos',
        [
          'Verifique se a reserva está ativa',
          'Verifique se há consumos pendentes',
          'Tente novamente em alguns instantes'
        ]
      );
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  const getConsumptionStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      billed: { label: 'Faturado', color: 'bg-blue-100 text-blue-800' },
      paid: { label: 'Pago', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };
  
  const getGuestName = (guest: Guest) => {
    return guest.client_type === 'individual'
      ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
      : guest.trade_name || guest.company_name || 'Empresa';
  };
  
  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'credit_card': return <CreditCard className="h-4 w-4 mr-2 text-gray-600" />;
      case 'debit_card': return <DollarSign className="h-4 w-4 mr-2 text-gray-600" />;
      case 'pix': return <Smartphone className="h-4 w-4 mr-2 text-gray-600" />;
      case 'cash': return <Banknote className="h-4 w-4 mr-2 text-gray-600" />;
      default: return <CreditCard className="h-4 w-4 mr-2 text-gray-600" />;
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <LogOut className="h-5 w-5 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 ml-2">
            Realizar Check-out
          </h3>
        </div>
        
        {/* Reservation info */}
        <div className="mb-6 bg-gray-50 p-3 rounded-lg">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Hóspede</p>
              <p className="font-medium">{getGuestName(reservation.guest)}</p>
            </div>
            <div>
              <p className="text-gray-600">Quarto</p>
              <p className="font-medium">{reservation.room.room_number}</p>
            </div>
            <div>
              <p className="text-gray-600">Check-in</p>
              <p className="font-medium">{formatDate(reservation.check_in_date)}</p>
            </div>
            <div>
              <p className="text-gray-600">Check-out</p>
              <p className="font-medium">{formatDate(reservation.check_out_date)}</p>
            </div>
          </div>
        </div>
        
        {/* Step indicator */}
        <div className="flex items-center mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            1
          </div>
          <div className={`h-1 flex-1 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            2
          </div>
        </div>
        
        {step === 1 && (
          <>
            <div className="space-y-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                <h4 className="font-medium text-gray-900">Revisão de Consumos</h4>
              </div>
              
              {consumptions.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-green-800">Não há consumos registrados para esta reserva.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-600">Esta reserva possui {consumptions.length} consumo(s):</p>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="pb-2">Item</th>
                          <th className="pb-2">Qtd</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consumptions.map(consumption => (
                          <tr key={consumption.id} className="border-t border-gray-200">
                            <td className="py-2">{consumption.product.name}</td>
                            <td className="py-2">{consumption.quantity}</td>
                            <td className="py-2">{getConsumptionStatusBadge(consumption.status)}</td>
                            <td className="py-2 text-right">
                              R$ {consumption.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {hasUnpaidConsumptions ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-yellow-800 font-medium">Consumos pendentes detectados</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Existem consumos pendentes que precisam ser finalizados antes de prosseguir com o check-out.
                      Clique em "Finalizar Consumos" para processá-los.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-green-800 font-medium">Consumos verificados</p>
                    <p className="text-green-700 text-sm mt-1">
                      Todos os consumos estão finalizados. Você pode prosseguir com o check-out.
                    </p>
                  </div>
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
              {hasUnpaidConsumptions ? (
                <button
                  onClick={handleFinalizeConsumptions}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processando...
                    </div>
                  ) : (
                    'Finalizar Consumos'
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setStep(2)}
                  className="btn-primary"
                >
                  Continuar
                </button>
              )}
            </div>
          </>
        )}
        
        {step === 2 && (
          <>
            <div className="space-y-4">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-primary-600 mr-2" />
                <h4 className="font-medium text-gray-900">Resumo do Check-out</h4>
              </div>
              
              <div className="card bg-gray-50 p-4">
                <CheckoutSummary 
                  reservation={reservation}
                  consumptions={consumptions}
                />
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Forma de Pagamento</h4>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200 ease-in-out ${paymentMethod === 'credit_card' ? 'border-primary-500 bg-primary-50' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="credit_card"
                      checked={paymentMethod === 'credit_card'}
                      onChange={() => setPaymentMethod('credit_card')}
                      className="mr-2"
                    />
                    <div className="flex items-center">
                      <CreditCard className={`h-4 w-4 mr-2 ${paymentMethod === 'credit_card' ? 'text-primary-600' : 'text-gray-600'}`} />
                      <span className={paymentMethod === 'credit_card' ? 'font-medium' : ''}>Cartão de Crédito</span>
                    </div>
                  </label>
                  
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200 ease-in-out ${paymentMethod === 'debit_card' ? 'border-primary-500 bg-primary-50' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="debit_card"
                      checked={paymentMethod === 'debit_card'}
                      onChange={() => setPaymentMethod('debit_card')}
                      className="mr-2"
                    />
                    <div className="flex items-center">
                      <DollarSign className={`h-4 w-4 mr-2 ${paymentMethod === 'debit_card' ? 'text-primary-600' : 'text-gray-600'}`} />
                      <span className={paymentMethod === 'debit_card' ? 'font-medium' : ''}>Cartão de Débito</span>
                    </div>
                  </label>
                  
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200 ease-in-out ${paymentMethod === 'cash' ? 'border-primary-500 bg-primary-50' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                      className="mr-2"
                    />
                    <div className="flex items-center">
                      <Banknote className={`h-4 w-4 mr-2 ${paymentMethod === 'cash' ? 'text-primary-600' : 'text-gray-600'}`} />
                      <span className={paymentMethod === 'cash' ? 'font-medium' : ''}>Dinheiro</span>
                    </div>
                  </label>
                  
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200 ease-in-out ${paymentMethod === 'pix' ? 'border-primary-500 bg-primary-50' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="pix"
                      checked={paymentMethod === 'pix'}
                      onChange={() => setPaymentMethod('pix')}
                      className="mr-2"
                    />
                    <div className="flex items-center">
                      <Smartphone className={`h-4 w-4 mr-2 ${paymentMethod === 'pix' ? 'text-primary-600' : 'text-gray-600'}`} />
                      <span className={paymentMethod === 'pix' ? 'font-medium' : ''}>PIX</span>
                    </div>
                  </label>
                </div>
                
                {/* Resumo do pagamento */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Método selecionado:</span>
                    <div className="flex items-center">
                      {getPaymentIcon(paymentMethod)}
                      <span className="font-medium">
                        {paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 
                         paymentMethod === 'debit_card' ? 'Cartão de Débito' : 
                         paymentMethod === 'cash' ? 'Dinheiro' : 'PIX'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">Valor total a pagar:</span>
                    <span className="font-bold text-primary-600">
                      R$ {(reservation.total_amount + consumptions.reduce((sum, c) => sum + c.total_amount, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    className="mt-1 mr-2"
                    checked={confirmCheckout}
                    onChange={(e) => setConfirmCheckout(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">
                    Confirmo que o hóspede está ciente do valor total e concordou com a forma de pagamento.
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
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
                <AlertTriangle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-blue-800 font-medium">Atenção</p>
                  <p className="text-blue-700 text-sm mt-1">
                    Ao confirmar o check-out, a reserva será finalizada e o quarto será liberado para novas reservas.
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setStep(1)}
                className="btn-secondary"
                disabled={loading}
              >
                Voltar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !confirmCheckout}
                className="btn-primary"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processando...
                  </div>
                ) : (
                  'Confirmar Check-out'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}