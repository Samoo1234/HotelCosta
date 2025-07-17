# Design para Melhoria do Fluxo de Reservas

## Visão Geral

Este documento detalha o design técnico para implementar as melhorias no fluxo de reservas do sistema de gestão hoteleira. O objetivo é resolver as inconsistências e pontos de confusão identificados, mantendo o layout e a estrutura visual existentes.

## Arquitetura

O sistema continuará utilizando a arquitetura atual:

- **Frontend**: Next.js 14 com App Router
- **Backend**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Estado**: React Hooks (useState, useEffect)
- **Estilização**: Tailwind CSS

## Componentes e Interfaces

### 1. Componente de Status da Reserva

Criaremos um novo componente reutilizável para exibir o status da reserva de forma consistente:

```tsx
// components/dashboard/ReservationStatus.tsx
interface ReservationStatusProps {
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  size?: 'sm' | 'md' | 'lg';
}

export default function ReservationStatus({ status, size = 'md' }: ReservationStatusProps) {
  const statusConfig = {
    confirmed: {
      label: 'Confirmada',
      color: 'bg-blue-100 text-blue-800',
      icon: Calendar
    },
    checked_in: {
      label: 'Check-in',
      color: 'bg-green-100 text-green-800',
      icon: LogIn
    },
    checked_out: {
      label: 'Check-out',
      color: 'bg-gray-100 text-gray-800',
      icon: LogOut
    },
    cancelled: {
      label: 'Cancelada',
      color: 'bg-red-100 text-red-800',
      icon: X
    },
    no_show: {
      label: 'Não Compareceu',
      color: 'bg-orange-100 text-orange-800',
      icon: AlertCircle
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.color} ${sizeClasses[size]}`}>
      <Icon className="h-4 w-4 mr-1" />
      {config.label}
    </span>
  );
}
```

### 2. Componente de Ações Contextuais

Criaremos um componente para exibir ações contextuais baseadas no status atual da reserva:

```tsx
// components/dashboard/ReservationActions.tsx
interface ReservationActionsProps {
  reservation: Reservation;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onCancel: () => void;
  hasUnpaidConsumptions: boolean;
}

export default function ReservationActions({
  reservation,
  onCheckIn,
  onCheckOut,
  onCancel,
  hasUnpaidConsumptions
}: ReservationActionsProps) {
  return (
    <div className="space-y-2">
      {reservation.status === 'confirmed' && (
        <button
          onClick={onCheckIn}
          className="btn-primary w-full flex items-center justify-center"
        >
          <LogIn className="h-4 w-4 mr-2" />
          Realizar Check-in
        </button>
      )}
      
      {reservation.status === 'checked_in' && (
        <button
          onClick={onCheckOut}
          className="btn-primary w-full flex items-center justify-center"
          disabled={hasUnpaidConsumptions}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Realizar Check-out
          {hasUnpaidConsumptions && (
            <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
              Consumos Pendentes
            </span>
          )}
        </button>
      )}
      
      {(reservation.status === 'confirmed' || reservation.status === 'checked_in') && (
        <button
          onClick={onCancel}
          className="btn-outline text-red-600 hover:bg-red-50 w-full flex items-center justify-center"
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar Reserva
        </button>
      )}
    </div>
  );
}
```

### 3. Componente de Resumo de Check-out

Criaremos um componente para exibir o resumo do check-out:

```tsx
// components/dashboard/CheckoutSummary.tsx
interface CheckoutSummaryProps {
  reservation: Reservation;
  consumptions: RoomConsumption[];
}

export default function CheckoutSummary({ reservation, consumptions }: CheckoutSummaryProps) {
  const totalConsumptions = consumptions.reduce((sum, c) => sum + c.total_amount, 0);
  const totalAmount = reservation.total_amount + totalConsumptions;
  
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Check-out</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Valor da Estadia:</span>
          <span className="font-medium">
            R$ {reservation.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Consumos:</span>
          <span className="font-medium">
            R$ {totalConsumptions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="border-t pt-3 flex justify-between">
          <span className="text-gray-800 font-medium">Total:</span>
          <span className="text-xl font-bold text-primary-600">
            R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
```

## Modais e Fluxos

### 1. Modal de Check-in

```tsx
// components/dashboard/CheckInModal.tsx
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
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      toast.success('Check-in realizado com sucesso!');
      onClose();
    } catch (error) {
      toast.error('Erro ao realizar check-in');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Realizar Check-in
        </h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Hóspede</p>
            <p className="font-medium text-gray-900">
              {getGuestName(reservation.guest)}
            </p>
          </div>
          
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
            disabled={loading}
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
```

### 2. Modal de Check-out

```tsx
// components/dashboard/CheckOutModal.tsx
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
  const hasUnpaidConsumptions = consumptions.some(c => c.status === 'pending');
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      toast.success('Check-out realizado com sucesso!');
      onClose();
    } catch (error) {
      toast.error('Erro ao realizar check-out');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFinalizeConsumptions = async () => {
    setLoading(true);
    try {
      await onFinalizeConsumptions();
      toast.success('Consumos finalizados com sucesso!');
      setStep(2);
    } catch (error) {
      toast.error('Erro ao finalizar consumos');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Realizar Check-out
        </h3>
        
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
              <h4 className="font-medium text-gray-900">Revisão de Consumos</h4>
              
              {consumptions.length === 0 ? (
                <p className="text-gray-600">Não há consumos registrados para esta reserva.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-600">Esta reserva possui {consumptions.length} consumo(s):</p>
                  <ul className="space-y-2">
                    {consumptions.map(c => (
                      <li key={c.id} className="flex justify-between items-center">
                        <span>{c.product.name} x{c.quantity}</span>
                        <div className="flex items-center gap-2">
                          <span>R$ {c.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          {getConsumptionStatusBadge(c.status)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {hasUnpaidConsumptions ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    Existem consumos pendentes que precisam ser finalizados antes de prosseguir com o check-out.
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">
                    Todos os consumos estão finalizados. Você pode prosseguir com o check-out.
                  </p>
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
              <h4 className="font-medium text-gray-900">Resumo do Check-out</h4>
              
              <CheckoutSummary 
                reservation={reservation}
                consumptions={consumptions}
              />
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  Ao confirmar o check-out, a reserva será finalizada e o quarto será liberado para novas reservas.
                </p>
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
                disabled={loading}
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
```

## Modelo de Dados

Não serão necessárias alterações no modelo de dados existente. Continuaremos utilizando as tabelas:

- `reservations`: Armazena as informações das reservas
- `guests`: Armazena os dados dos hóspedes
- `rooms`: Armazena as informações dos quartos
- `room_consumptions`: Armazena os consumos associados às reservas
- `payments`: Armazena os pagamentos realizados

## Tratamento de Erros

Implementaremos um tratamento de erros mais robusto:

1. **Validações de Status**: Verificar se a transição de status é válida antes de permitir a ação
2. **Mensagens de Erro Claras**: Exibir mensagens específicas para cada tipo de erro
3. **Logs Detalhados**: Registrar informações detalhadas sobre erros para facilitar a depuração

## Estratégia de Testes

Serão implementados testes para garantir o funcionamento correto do fluxo:

1. **Testes de Unidade**: Para os novos componentes
2. **Testes de Integração**: Para verificar a interação entre os componentes
3. **Testes de Fluxo**: Para validar o fluxo completo de reservas

## Considerações de UX/UI

Para manter a consistência com o design existente:

1. **Cores e Estilos**: Utilizar as mesmas cores e estilos já definidos no sistema
2. **Componentes**: Reutilizar componentes existentes sempre que possível
3. **Layout**: Manter a estrutura de layout atual, apenas reorganizando elementos para melhorar a clareza