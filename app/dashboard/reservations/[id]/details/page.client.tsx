'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Calendar, User, Bed, DollarSign, FileText, Phone, 
  Mail, MapPin, Edit, Trash2, ShoppingCart, CreditCard, 
  AlertTriangle, Clock, CheckCircle, Info, LogIn, LogOut, X
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatDate, getLocalISOString } from '@/lib/utils'
import ReservationStatus from '@/components/dashboard/ReservationStatus'
import ReservationActions from '@/components/dashboard/ReservationActions'
import CheckInModal from '@/components/dashboard/CheckInModal'
import CheckOutModal from '@/components/dashboard/CheckOutModal'
import CancelReservationModal from '@/components/dashboard/CancelReservationModal'
import { 
  performCheckIn as doCheckIn, 
  performCheckOut as doCheckOut, 
  cancelReservation as doCancel, 
  finalizeConsumptions as doFinalizeConsumptions,
  isValidStatusTransition,
  getTransitionErrorMessage,
  validateStatusTransitionRequirements
} from './actions'

interface ReservationDetailsClientProps {
  reservation: any;
  consumptions: any[];
  consumptionsLoading: boolean;
  onReload: () => void;
  onCheckOut?: () => void;
  onFinalizeConsumptions?: () => void;
}

export default function ReservationDetailsClient({ 
  reservation, 
  consumptions,
  consumptionsLoading,
  onReload,
  onCheckOut,
  onFinalizeConsumptions
}: ReservationDetailsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [consumptionFilter, setConsumptionFilter] = useState('all')
  
  const hasUnpaidConsumptions = consumptions.some(c => c.status === 'pending')
  
  // Filtrar consumos com base no filtro selecionado
  const filteredConsumptions = consumptionFilter === 'all' 
    ? consumptions 
    : consumptions.filter(c => c.status === consumptionFilter)
  
  // Calcular dias restantes até o check-out (apenas se houver data de check-out)
  let daysUntilCheckout = null
  let isCheckoutSoon = false
  
  if (reservation.check_out_date) {
    daysUntilCheckout = Math.ceil((new Date(reservation.check_out_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    isCheckoutSoon = daysUntilCheckout <= 1 && daysUntilCheckout >= 0 && reservation.status === 'checked_in'
  }
  
  // Função para finalizar um consumo específico
  const handleFinalizeConsumption = async (consumptionId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('room_consumptions')
        .update({ status: 'billed' })
        .eq('id', consumptionId)
      
      if (error) throw error
      
      toast.success('Consumo faturado com sucesso!')
      onReload()
    } catch (error) {
      console.error('Error finalizing consumption:', error)
      toast.error('Erro ao faturar consumo')
    } finally {
      setLoading(false)
    }
  }
  
  // Função para finalizar todos os consumos pendentes
  const handleFinalizeAllConsumptions = async () => {
    if (onFinalizeConsumptions) {
      // Use the function passed from the parent component if available
      return onFinalizeConsumptions()
    } else {
      // Fallback to local implementation
      return finalizeConsumptions()
    }
  }
  
  // Funções de transição de status já importadas no topo do arquivo
  
  const performCheckIn = async () => {
    setLoading(true)
    try {
      // Usar a função aprimorada que já inclui validações
      const result = await doCheckIn(reservation.id)
      
      // Mostrar feedback visual com a mensagem retornada pela função
      toast.success(result.message || 'Check-in realizado com sucesso!')
      
      // Se houver alertas, mostrar como notificações informativas
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          toast.success(warning, { 
            icon: '⚠️',
            duration: 6000
          })
        })
      }
      
      // Mostrar notificação sobre o status do quarto
      if (result.roomStatus === 'occupied') {
        toast.success(`Quarto ${reservation.room.room_number} marcado como ocupado`, {
          duration: 4000
        })
      }
      
      onReload()
    } catch (error) {
      console.error('Error performing check-in:', error)
      
      // Mostrar mensagem de erro específica
      toast.error('Erro ao realizar check-in: ' + ((error as Error).message || 'Erro desconhecido'), {
        duration: 5000
      })
    } finally {
      setLoading(false)
      setShowCheckInModal(false)
    }
  }
  
  const performCheckOut = async (paymentMethod: string = 'credit_card') => {
    setLoading(true)
    try {
      // Usar a função aprimorada que já inclui validações
      const result = await doCheckOut(reservation.id, consumptions, paymentMethod)
      
      // Mostrar feedback visual com a mensagem retornada pela função
      toast.success(result.message || 'Check-out realizado com sucesso!')
      
      // Mostrar informações do pagamento
      if (result && result.payment_id) {
        toast.success(`Pagamento registrado: R$ ${result.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
          duration: 5000,
          icon: '💰'
        })
        
        // Mostrar detalhes adicionais do pagamento
        if (result.stay_duration) {
          toast.success(`Estadia de ${result.stay_duration} ${result.stay_duration > 1 ? 'diárias' : 'diária'} finalizada`, {
            duration: 4000
          })
        }
        
        // Mostrar detalhes dos consumos se houver
        if (result.consumptions_count > 0) {
          toast.success(`${result.consumptions_count} consumo(s) registrado(s): R$ ${result.consumption_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
            duration: 4000
          })
        }
      }
      
      // Se houver alertas, mostrar como notificações informativas
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          toast.success(warning, { 
            icon: '⚠️',
            duration: 6000
          })
        })
      }
      
      // Mostrar notificação sobre o status do quarto
      if (result.roomStatus === 'available') {
        toast.success(`Quarto ${reservation.room.room_number} liberado para novas reservas`, {
          duration: 5000,
          icon: '🔑'
        })
      }
      
      onReload()
    } catch (error) {
      console.error('Error performing check-out:', error)
      
      // Mostrar mensagem de erro específica
      toast.error('Erro ao realizar check-out: ' + ((error as Error).message || 'Erro desconhecido'), {
        duration: 5000
      })
    } finally {
      setLoading(false)
      setShowCheckOutModal(false)
    }
  }
  
  const performCancel = async (reason: string) => {
    setLoading(true)
    try {
      // Usar a função aprimorada que já inclui validações
      const result = await doCancel(reservation.id, reason)
      
      // Mostrar feedback visual com a mensagem retornada pela função
      toast.success(result.message || 'Reserva cancelada com sucesso!')
      
      // Se houver alertas, mostrar como notificações informativas
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          toast.success(warning, { 
            icon: '⚠️',
            duration: 6000
          })
        })
      }
      
      // Mostrar notificação sobre o status do quarto
      if (result.roomStatus === 'available') {
        toast.success(`Quarto ${reservation.room.room_number} liberado para novas reservas`, {
          duration: 4000
        })
      }
      
      onReload()
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      
      // Mostrar mensagem de erro específica
      toast.error('Erro ao cancelar reserva: ' + ((error as Error).message || 'Erro desconhecido'), {
        duration: 5000
      })
    } finally {
      setLoading(false)
      setShowCancelModal(false)
    }
  }
  
  const finalizeConsumptions = async () => {
    setLoading(true)
    try {
      // Usar a função aprimorada que já inclui validações
      const result = await doFinalizeConsumptions(reservation.id)
      
      // Mostrar feedback visual com a mensagem retornada pela função
      toast.success(result.message || 'Consumos finalizados com sucesso!')
      
      // Se não houver consumos para finalizar, mostrar uma mensagem informativa
      if (result.updatedCount === 0) {
        toast.success('Não há consumos pendentes para finalizar.', {
          icon: 'ℹ️',
          duration: 4000
        })
      } else {
        // Mostrar quantidade de consumos finalizados
        toast.success(`${result.updatedCount} consumo(s) finalizado(s) com sucesso.`, {
          duration: 4000
        })
      }
      
      onReload()
    } catch (error) {
      console.error('Error finalizing consumptions:', error)
      
      // Mostrar mensagem de erro específica
      toast.error('Erro ao finalizar consumos: ' + ((error as Error).message || 'Erro desconhecido'), {
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }
  
  const getGuestName = (guest: any) => {
    if (!guest) return 'Hóspede indefinido'
    return guest.client_type === 'individual'
      ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Nome não informado'
      : guest.trade_name || guest.company_name || 'Empresa'
  }
  
  const getNextAction = () => {
    switch (reservation.status) {
      case 'confirmed':
        return {
          title: 'Realizar Check-in',
          description: 'O hóspede está pronto para entrar no quarto.',
          action: () => setShowCheckInModal(true),
          icon: LogIn
        };
      case 'checked_in':
        return {
          title: 'Realizar Check-out',
          description: hasUnpaidConsumptions 
            ? 'Existem consumos pendentes que precisam ser finalizados antes do check-out.' 
            : 'O hóspede está pronto para deixar o quarto.',
          action: () => onCheckOut ? onCheckOut() : setShowCheckOutModal(true),
          icon: LogOut,
          warning: hasUnpaidConsumptions
        };
      case 'checked_out':
        return {
          title: 'Reserva Finalizada',
          description: 'Esta reserva já foi finalizada com sucesso.',
          icon: CheckCircle
        };
      case 'cancelled':
        return {
          title: 'Reserva Cancelada',
          description: 'Esta reserva foi cancelada.',
          icon: Info
        };
      default:
        return null;
    }
  }
  
  const nextAction = getNextAction()
  
  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Link 
            href="/dashboard/reservations"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                Reserva #{reservation.id.slice(-8)}
              </h1>
              <ReservationStatus status={reservation.status} size="md" />
            </div>
            <p className="text-gray-600 mt-2">
              {getGuestName(reservation.guest)} - Quarto {reservation.room.room_number}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/reservations/${reservation.id}`}
            className="btn-secondary"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
          {(reservation.status === 'confirmed' || reservation.status === 'checked_in') && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Status and Quick Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Check-in</p>
              <p className="text-sm font-bold text-gray-900">
                {formatDate(reservation.check_in_date)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Check-out</p>
              <p className="text-sm font-bold text-gray-900">
                {formatDate(reservation.check_out_date)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Bed className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Noites</p>
              <p className="text-lg font-bold text-gray-900">
                {reservation.check_out_date 
                  ? Math.ceil((new Date(reservation.check_out_date).getTime() - new Date(reservation.check_in_date).getTime()) / (1000 * 60 * 60 * 24))
                  : 'Em aberto'
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-lg font-bold text-gray-900">
                R$ {reservation.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Next Action and Alerts */}
      {isCheckoutSoon && reservation.check_out_date && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
          <Clock className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Check-out em breve</p>
            <p className="text-yellow-700 text-sm mt-1">
              {daysUntilCheckout === 0 
                ? 'O check-out está programado para hoje.' 
                : `O check-out está programado para amanhã (${formatDate(reservation.check_out_date)}).`}
              {hasUnpaidConsumptions && ' Existem consumos pendentes que precisam ser finalizados.'}
            </p>
          </div>
        </div>
      )}
      
      {/* Alert for open checkout */}
      {!reservation.check_out_date && reservation.status === 'checked_in' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
          <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <p className="text-blue-800 font-medium">Check-out em aberto</p>
            <p className="text-blue-700 text-sm mt-1">
              Esta reserva não possui data de check-out definida. O hóspede pode permanecer até realizar o check-out.
              {hasUnpaidConsumptions && ' Existem consumos pendentes que precisam ser finalizados.'}
            </p>
          </div>
        </div>
      )}
      
      {/* Actions Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Detalhes da Reserva
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Informações do Hóspede</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <User className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Nome</p>
                      <p className="font-medium">{getGuestName(reservation.guest)}</p>
                    </div>
                  </div>
                  
                  {reservation.guest.email && (
                    <div className="flex items-start">
                      <Mail className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{reservation.guest.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {reservation.guest.phone && (
                    <div className="flex items-start">
                      <Phone className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Telefone</p>
                        <p className="font-medium">{reservation.guest.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Informações do Quarto</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Bed className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Quarto</p>
                      <p className="font-medium">{reservation.room.room_number} - {reservation.room.room_type}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Calendar className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Período</p>
                      <p className="font-medium">{formatDate(reservation.check_in_date)} - {formatDate(reservation.check_out_date)}</p>
                    </div>
                  </div>
                  
                  {reservation.special_requests && (
                    <div className="flex items-start">
                      <FileText className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Solicitações Especiais</p>
                        <p className="font-medium">{reservation.special_requests}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Consumptions Section - Enhanced */}
          <div className="card mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  Consumos
                </h2>
                {hasUnpaidConsumptions && (
                  <div className="flex items-center animate-pulse">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {consumptions.filter(c => c.status === 'pending').length} Pendente(s)
                    </span>
                  </div>
                )}
              </div>
              
              {reservation.status === 'checked_in' && (
                <div className="flex gap-2">
                  {hasUnpaidConsumptions && (
                    <button
                      onClick={() => handleFinalizeAllConsumptions()}
                      className="btn-secondary text-sm text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 flex items-center"
                      title="Finalizar todos os consumos pendentes"
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Finalizar Todos
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/dashboard/consumptions/new?reservation_id=${reservation.id}`)}
                    className="btn-secondary text-sm flex items-center"
                    title="Adicionar novo consumo à reserva"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1.5" />
                    Adicionar Consumo
                  </button>
                </div>
              )}
            </div>
            
            {/* Enhanced Status Summary Cards */}
            {!consumptionsLoading && consumptions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {/* Total Consumptions Card */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 shadow-sm hover:shadow transition-shadow duration-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-1.5 bg-gray-200 rounded-md mr-2">
                        <ShoppingCart className="h-4 w-4 text-gray-700" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Total</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {consumptions.length}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Valor: R$ {consumptions.reduce((sum, c) => sum + c.total_amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-400" style={{ width: '100%' }}></div>
                  </div>
                </div>
                
                {/* Pending Consumptions Card */}
                <div className={`rounded-lg p-3 border shadow-sm hover:shadow transition-shadow duration-200 ${hasUnpaidConsumptions ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className={`p-1.5 rounded-md mr-2 ${hasUnpaidConsumptions ? 'bg-yellow-200' : 'bg-gray-200'}`}>
                        <AlertTriangle className={`h-4 w-4 ${hasUnpaidConsumptions ? 'text-yellow-700' : 'text-gray-400'}`} />
                      </div>
                      <span className={`text-sm font-medium ${hasUnpaidConsumptions ? 'text-yellow-700' : 'text-gray-400'}`}>Pendentes</span>
                    </div>
                    <span className={`text-lg font-bold ${hasUnpaidConsumptions ? 'text-yellow-700' : 'text-gray-400'}`}>
                      {consumptions.filter(c => c.status === 'pending').length}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Valor: R$ {consumptions
                      .filter(c => c.status === 'pending')
                      .reduce((sum, c) => sum + c.total_amount, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${hasUnpaidConsumptions ? 'bg-yellow-400' : 'bg-gray-200'}`} 
                      style={{ 
                        width: `${consumptions.length > 0 ? 
                          (consumptions.filter(c => c.status === 'pending').length / consumptions.length) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  {hasUnpaidConsumptions && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => handleFinalizeAllConsumptions()}
                        className="text-xs text-yellow-700 hover:text-yellow-800 hover:underline flex items-center"
                        title="Finalizar todos os consumos pendentes"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Finalizar todos
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Finalized Consumptions Card */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 shadow-sm hover:shadow transition-shadow duration-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-1.5 bg-green-200 rounded-md mr-2">
                        <CheckCircle className="h-4 w-4 text-green-700" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Finalizados</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {consumptions.filter(c => c.status === 'billed' || c.status === 'paid').length}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Valor: R$ {consumptions
                      .filter(c => c.status === 'billed' || c.status === 'paid')
                      .reduce((sum, c) => sum + c.total_amount, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-400" 
                      style={{ 
                        width: `${consumptions.length > 0 ? 
                          (consumptions.filter(c => c.status === 'billed' || c.status === 'paid').length / consumptions.length) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            
            {consumptionsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : consumptions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>Nenhum consumo registrado para esta reserva.</p>
                {reservation.status === 'checked_in' && (
                  <button
                    onClick={() => router.push(`/dashboard/consumptions/new?reservation_id=${reservation.id}`)}
                    className="mt-4 btn-secondary text-sm inline-flex items-center"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Adicionar Primeiro Consumo
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Enhanced Consumption Filters */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setConsumptionFilter('all')}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      consumptionFilter === 'all' 
                        ? 'bg-gray-800 text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    title="Mostrar todos os consumos"
                  >
                    Todos ({consumptions.length})
                  </button>
                  <button
                    onClick={() => setConsumptionFilter('pending')}
                    className={`px-3 py-1 text-xs rounded-full flex items-center transition-colors ${
                      consumptionFilter === 'pending' 
                        ? 'bg-yellow-600 text-white shadow-sm' 
                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    }`}
                    title="Mostrar apenas consumos pendentes"
                  >
                    {consumptionFilter === 'pending' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    Pendentes ({consumptions.filter(c => c.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setConsumptionFilter('billed')}
                    className={`px-3 py-1 text-xs rounded-full flex items-center transition-colors ${
                      consumptionFilter === 'billed' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                    title="Mostrar apenas consumos faturados"
                  >
                    {consumptionFilter === 'billed' && <CheckCircle className="h-3 w-3 mr-1" />}
                    Faturados ({consumptions.filter(c => c.status === 'billed').length})
                  </button>
                  <button
                    onClick={() => setConsumptionFilter('paid')}
                    className={`px-3 py-1 text-xs rounded-full flex items-center transition-colors ${
                      consumptionFilter === 'paid' 
                        ? 'bg-green-600 text-white shadow-sm' 
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                    title="Mostrar apenas consumos pagos"
                  >
                    {consumptionFilter === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                    Pagos ({consumptions.filter(c => c.status === 'paid').length})
                  </button>
                </div>
                
                {/* Enhanced Consumption Table */}
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 font-medium">Item</th>
                        <th className="px-4 py-3 font-medium">Qtd</th>
                        <th className="px-4 py-3 font-medium">Data</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Valor</th>
                        {reservation.status === 'checked_in' && <th className="px-4 py-3 font-medium text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConsumptions.map((consumption, index) => {
                        const statusConfig = {
                          pending: { 
                            label: 'Pendente', 
                            color: 'bg-yellow-100 text-yellow-800',
                            icon: AlertTriangle,
                            iconColor: 'text-yellow-600'
                          },
                          billed: { 
                            label: 'Faturado', 
                            color: 'bg-blue-100 text-blue-800',
                            icon: CheckCircle,
                            iconColor: 'text-blue-600'
                          },
                          paid: { 
                            label: 'Pago', 
                            color: 'bg-green-100 text-green-800',
                            icon: CheckCircle,
                            iconColor: 'text-green-600'
                          },
                          cancelled: { 
                            label: 'Cancelado', 
                            color: 'bg-red-100 text-red-800',
                            icon: X,
                            iconColor: 'text-red-600'
                          }
                        };
                        
                        const config = (statusConfig as any)[consumption.status] || { 
                          label: consumption.status, 
                          color: 'bg-gray-100 text-gray-800',
                          icon: Info,
                          iconColor: 'text-gray-600'
                        };
                        
                        const StatusIcon = config.icon;
                        
                        return (
                          <tr 
                            key={consumption.id} 
                            className={`border-t ${
                              consumption.status === 'pending' 
                                ? 'bg-yellow-50' 
                                : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-start">
                                <div className={`p-1 rounded-md mr-2 ${
                                  consumption.status === 'pending' 
                                    ? 'bg-yellow-100' 
                                    : consumption.status === 'billed'
                                      ? 'bg-blue-100'
                                      : consumption.status === 'paid'
                                        ? 'bg-green-100'
                                        : 'bg-gray-100'
                                }`}>
                                  <StatusIcon className={`h-3 w-3 ${config.iconColor}`} />
                                </div>
                                <div>
                                  <div className="font-medium">{consumption.product.name}</div>
                                  {consumption.notes && (
                                    <div className="text-xs text-gray-500 mt-1">{consumption.notes}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">{consumption.quantity}</td>
                            <td className="px-4 py-3">{formatDate(consumption.consumption_date)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {config.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              R$ {consumption.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            {reservation.status === 'checked_in' && (
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  {consumption.status === 'pending' && (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleFinalizeConsumption(consumption.id)}
                                        className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                                        title="Faturar este consumo"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => router.push(`/dashboard/consumptions/${consumption.id}/edit`)}
                                        className="p-1 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
                                        title="Editar este consumo"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => router.push(`/dashboard/consumptions/${consumption.id}`)}
                                        className="p-1 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
                                        title="Ver detalhes deste consumo"
                                      >
                                        <Info className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                  {consumption.status !== 'pending' && (
                                    <button
                                      onClick={() => router.push(`/dashboard/consumptions/${consumption.id}`)}
                                      className="p-1 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
                                      title="Ver detalhes deste consumo"
                                    >
                                      <Info className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-100 font-bold border-t">
                        <td colSpan={4} className="px-4 py-3 text-gray-700">Total</td>
                        <td className="px-4 py-3 text-right">
                          R$ {filteredConsumptions.reduce((sum, c) => sum + c.total_amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        {reservation.status === 'checked_in' && <td></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Enhanced Resumo de consumos por categoria */}
                {consumptions.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <FileText className="h-4 w-4 mr-1.5 text-gray-500" />
                      Resumo por Categoria
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {Object.entries(
                        consumptions.reduce((acc, curr) => {
                          const category = curr.product.category || 'Outros';
                          if (!acc[category]) {
                            acc[category] = {
                              total: 0,
                              pending: 0,
                              billed: 0,
                              paid: 0,
                              items: 0
                            };
                          }
                          acc[category].total += curr.total_amount;
                          acc[category].items += 1;
                          
                          if (curr.status === 'pending') {
                            acc[category].pending += curr.total_amount;
                          } else if (curr.status === 'billed') {
                            acc[category].billed += curr.total_amount;
                          } else if (curr.status === 'paid') {
                            acc[category].paid += curr.total_amount;
                          }
                          
                          return acc;
                        }, {} as Record<string, { total: number, pending: number, billed: number, paid: number, items: number }>)
                      ).map(([category, data]) => {
                        // Calculate percentage of pending amount
                        const categoryData = data as { total: number, pending: number, billed: number, paid: number, items: number };
                        const pendingPercentage = categoryData.total > 0 ? (categoryData.pending / categoryData.total) * 100 : 0;
                        const billedPercentage = categoryData.total > 0 ? (categoryData.billed / categoryData.total) * 100 : 0;
                        const paidPercentage = categoryData.total > 0 ? (categoryData.paid / categoryData.total) * 100 : 0;
                        
                        // Determine card style based on pending status
                        const hasPending = categoryData.pending > 0;
                        const cardStyle = hasPending 
                          ? 'border-yellow-200 bg-white shadow-sm' 
                          : 'border-gray-200 bg-white';
                          
                        return (
                          <div 
                            key={category} 
                            className={`flex flex-col p-3 rounded-lg border ${cardStyle} hover:shadow transition-shadow duration-200`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                {hasPending && (
                                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
                                )}
                                <span className="text-sm font-medium text-gray-800">{category}</span>
                              </div>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {categoryData.items} {categoryData.items === 1 ? 'item' : 'itens'}
                              </span>
                            </div>
                            
                            <div className="mt-2 flex justify-between items-center">
                              <span className="text-sm text-gray-500">Total:</span>
                              <span className="text-sm font-medium">
                                R$ {categoryData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            
                            {/* Status breakdown */}
                            {categoryData.pending > 0 && (
                              <div className="mt-1 flex justify-between items-center">
                                <span className="text-xs text-yellow-600 flex items-center">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Pendente:
                                </span>
                                <span className="text-xs font-medium text-yellow-600">
                                  R$ {categoryData.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                            
                            {categoryData.billed > 0 && (
                              <div className="mt-1 flex justify-between items-center">
                                <span className="text-xs text-blue-600 flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Faturado:
                                </span>
                                <span className="text-xs font-medium text-blue-600">
                                  R$ {categoryData.billed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                            
                            {categoryData.paid > 0 && (
                              <div className="mt-1 flex justify-between items-center">
                                <span className="text-xs text-green-600 flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Pago:
                                </span>
                                <span className="text-xs font-medium text-green-600">
                                  R$ {categoryData.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                            
                            {/* Progress bar */}
                            <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div className="flex h-full">
                                {pendingPercentage > 0 && (
                                  <div 
                                    className="h-full bg-yellow-400" 
                                    style={{ width: `${pendingPercentage}%` }}
                                    title={`Pendente: ${pendingPercentage.toFixed(1)}%`}
                                  ></div>
                                )}
                                {billedPercentage > 0 && (
                                  <div 
                                    className="h-full bg-blue-400" 
                                    style={{ width: `${billedPercentage}%` }}
                                    title={`Faturado: ${billedPercentage.toFixed(1)}%`}
                                  ></div>
                                )}
                                {paidPercentage > 0 && (
                                  <div 
                                    className="h-full bg-green-400" 
                                    style={{ width: `${paidPercentage}%` }}
                                    title={`Pago: ${paidPercentage.toFixed(1)}%`}
                                  ></div>
                                )}
                              </div>
                            </div>
                            
                            {/* Quick action for pending items */}
                            {hasPending && reservation.status === 'checked_in' && (
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={() => {
                                    // Filter consumptions by category and pending status
                                    const pendingConsumptionsInCategory = consumptions.filter(
                                      c => (c.product.category || 'Outros') === category && c.status === 'pending'
                                    );
                                    
                                    // Show confirmation toast
                                    toast.success(`Finalizando ${pendingConsumptionsInCategory.length} consumo(s) de ${category}...`, {
                                      duration: 2000
                                    });
                                    
                                    // Finalize each consumption
                                    Promise.all(
                                      pendingConsumptionsInCategory.map(c => 
                                        handleFinalizeConsumption(c.id)
                                      )
                                    ).then(() => {
                                      toast.success(`Consumos de ${category} finalizados com sucesso!`);
                                    });
                                  }}
                                  className="text-xs text-yellow-700 hover:text-yellow-800 hover:underline flex items-center"
                                  title={`Finalizar todos os consumos pendentes de ${category}`}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Finalizar categoria
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {hasUnpaidConsumptions && reservation.status === 'checked_in' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Consumos pendentes detectados
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Esta reserva possui {consumptions.filter(c => c.status === 'pending').length} consumo(s) pendente(s) que precisam ser finalizados antes do check-out.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleFinalizeAllConsumptions()}
                      className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 flex items-center transition-colors"
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Finalizar Todos os Consumos
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions Column */}
        <div>
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Ações Disponíveis
            </h2>
            
            <ReservationActions
              reservation={reservation}
              onCheckIn={() => setShowCheckInModal(true)}
              onCheckOut={() => setShowCheckOutModal(true)}
              onCancel={() => setShowCancelModal(true)}
              onAddConsumption={() => router.push(`/dashboard/consumptions/new?reservation_id=${reservation.id}`)}
              hasUnpaidConsumptions={hasUnpaidConsumptions}
            />
          </div>
          
          {nextAction && (
            <div className="card mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Próxima Ação Recomendada
              </h2>
              
              <div className={`p-4 rounded-lg ${nextAction.warning ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                <div className="flex items-start">
                  {nextAction.icon && (
                    <span className={`h-5 w-5 mr-3 mt-0.5 inline-flex ${nextAction.warning ? 'text-yellow-600' : 'text-blue-600'}`}>
                      {React.createElement(nextAction.icon)}
                    </span>
                  )}
                  <div>
                    <h3 className={`font-medium ${nextAction.warning ? 'text-yellow-800' : 'text-blue-800'}`}>
                      {nextAction.title}
                    </h3>
                    <p className={`text-sm mt-1 ${nextAction.warning ? 'text-yellow-700' : 'text-blue-700'}`}>
                      {nextAction.description}
                    </p>
                    
                    {nextAction.action && (
                      <button
                        onClick={nextAction.action}
                        className={`mt-3 px-4 py-2 rounded-md text-sm font-medium ${
                          nextAction.warning 
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {nextAction.title}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {reservation.status === 'checked_in' && (
            <div className="card mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Pagamentos
              </h2>
              
              <Link 
                href={`/dashboard/payments/new?reservation_id=${reservation.id}`}
                className="btn-secondary w-full flex items-center justify-center"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Registrar Pagamento
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      <CheckInModal
        reservation={reservation}
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onConfirm={performCheckIn}
      />
      
      <CheckOutModal
        reservation={reservation}
        consumptions={consumptions}
        isOpen={showCheckOutModal}
        onClose={() => setShowCheckOutModal(false)}
        onConfirm={performCheckOut}
        onFinalizeConsumptions={finalizeConsumptions}
      />
      
      <CancelReservationModal
        reservation={reservation}
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={performCancel}
      />
    </div>
  )
}