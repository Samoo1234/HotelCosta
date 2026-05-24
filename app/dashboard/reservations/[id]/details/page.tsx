'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, AlertTriangle, LogIn, LogOut, CheckCircle, Info, Clock, Bed, DollarSign, User, Mail, Phone, FileText } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ReservationStatus from '@/components/dashboard/ReservationStatus'
import ReservationActions from '@/components/dashboard/ReservationActions'
import CheckInModal from '@/components/dashboard/CheckInModal'
import CheckOutModal from '@/components/dashboard/CheckOutModal'
import CancelReservationModal from '@/components/dashboard/CancelReservationModal'
import { getLocalISOString, formatDate } from '@/lib/utils'
import { 
  performCheckIn, 
  performCheckOut, 
  cancelReservation, 
  finalizeConsumptions,
  isValidStatusTransition,
  getTransitionErrorMessage,
  validateStatusTransitionRequirements
} from './actions'

import { calculateCheckoutPricing } from '@/lib/checkout-utils'
import ReservationActionsWrapper from './reservation-actions-wrapper'

export default function ReservationDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [reservation, setReservation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [consumptions, setConsumptions] = useState<any[]>([])
  const [consumptionsLoading, setConsumptionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [hotelSettings, setHotelSettings] = useState<{ check_in_time: string, check_out_time: string } | null>(null)

  const rawId = params?.id
  const reservationId = (Array.isArray(rawId) ? rawId[0] : rawId) || ''

  useEffect(() => {
    if (reservationId) {
      fetchReservation()
      fetchConsumptions()
      fetchHotelSettings()
    }
  }, [reservationId])

  const fetchHotelSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('check_in_time, check_out_time')
        .limit(1)
        .single()
      
      if (error) throw error
      if (data) {
        setHotelSettings({
          check_in_time: data.check_in_time || '14:00',
          check_out_time: data.check_out_time || '12:00'
        })
      }
    } catch (err) {
      console.warn('Erro ao carregar configurações do hotel, usando padrões:', err)
      setHotelSettings({ check_in_time: '14:00', check_out_time: '12:00' })
    }
  }

  const fetchReservation = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guest:guests(*),
          room:rooms(*)
        `)
        .eq('id', reservationId)
        .single()

      if (error) throw error
      setReservation(data)
    } catch (error) {
      setError('Não foi possível carregar os dados da reserva. Verifique se a reserva existe.')
      toast.error('Erro ao carregar reserva')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchConsumptions = async () => {
    if (!reservationId) return
    
    setConsumptionsLoading(true)
    try {
      const { data, error } = await supabase
        .from('room_consumptions')
        .select(`
          *,
          product:products(*)
        `)
        .eq('reservation_id', reservationId)
        .order('consumption_date', { ascending: false })

      if (error) throw error
      setConsumptions(data || [])
    } catch (error) {
      console.error('Error loading consumptions:', error)
      toast.error('Erro ao carregar consumos')
    } finally {
      setConsumptionsLoading(false)
    }
  }

  const reloadData = async () => {
    await Promise.all([
      fetchReservation(),
      fetchConsumptions()
    ])
  }

  // Funções para lidar com ações da reserva
  const handleCheckIn = async () => {
    setActionLoading(true)
    try {
      const result = await performCheckIn(reservation.id)
      
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
      
      // Registrar a transição de status no console para depuração
      console.log(`Status da reserva alterado: ${result.previousStatus} -> ${result.newStatus}`)
      
      await reloadData()
    } catch (error: any) {
      console.error('Error performing check-in:', error)
      
      // Mostrar mensagem de erro específica
      toast.error('Erro ao realizar check-in: ' + (error.message || 'Erro desconhecido'), {
        duration: 5000
      })
    } finally {
      setActionLoading(false)
      setShowCheckInModal(false)
    }
  }
  
  const handleCheckOut = async (paymentMethod = 'credit_card') => {
    console.log('🔄 Iniciando processo de check-out...', { reservationId: reservation.id, paymentMethod })
    setActionLoading(true)
    try {
      // Verificar se há consumos pendentes
      const hasUnpaidConsumptions = consumptions.some(c => c.status === 'pending')
      console.log('📋 Verificação de consumos:', { hasUnpaidConsumptions, consumptionsCount: consumptions.length })
      
      // Se houver consumos pendentes, finalizá-los primeiro
      if (hasUnpaidConsumptions) {
        console.log('⏳ Finalizando consumos pendentes...')
        await handleFinalizeConsumptions()
        console.log('✅ Consumos finalizados com sucesso')
      }
      
      // Realizar o check-out com o método de pagamento selecionado
      console.log('💳 Iniciando processo de check-out no backend...')
      const result = await performCheckOut(reservation.id, consumptions, paymentMethod)
      console.log('✅ Check-out realizado com sucesso:', result)
      
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
      
      // Registrar a transição de status no console para depuração
      console.log(`Status da reserva alterado: ${result.previousStatus} -> ${result.newStatus}`)
      
      await reloadData()
    } catch (error: any) {
      console.error('Error performing check-out:', error)
      
      // Mostrar mensagem de erro específica
      toast.error('Erro ao realizar check-out: ' + (error.message || 'Erro desconhecido'), {
        duration: 5000
      })
    } finally {
      setActionLoading(false)
      setShowCheckOutModal(false)
    }
  }
  
  const handleCancel = async (reason: string) => {
    setActionLoading(true)
    try {
      const result = await cancelReservation(reservation.id, reason)
      
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
      
      // Registrar a transição de status no console para depuração
      console.log(`Status da reserva alterado: ${result.previousStatus} -> ${result.newStatus}`)
      
      await reloadData()
    } catch (error: any) {
      console.error('Error cancelling reservation:', error)
      
      // Mostrar mensagem de erro específica
      toast.error('Erro ao cancelar reserva: ' + (error.message || 'Erro desconhecido'), {
        duration: 5000
      })
    } finally {
      setActionLoading(false)
      setShowCancelModal(false)
    }
  }
  
  const handleFinalizeConsumptions = async () => {
    setActionLoading(true)
    try {
      const result = await finalizeConsumptions(reservation.id)
      
      // Mostrar feedback visual com a mensagem retornada pela função
      toast.success(result.message || 'Consumos finalizados com sucesso!')
      
      // Se não houver consumos para finalizar, mostrar uma mensagem informativa
      if (result.updatedCount === 0) {
        toast.success('Não há consumos pendentes para finalizar.', {
          icon: 'ℹ️',
          duration: 4000
        })
      }
      
      await reloadData()
    } catch (error: any) {
      console.error('Error finalizing consumptions:', error)
      
      // Mostrar mensagem de erro específica
      toast.error('Erro ao finalizar consumos: ' + (error.message || 'Erro desconhecido'), {
        duration: 5000
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Função para obter a próxima ação recomendada
  const getNextAction = () => {
    if (!reservation) return null;
    
    const hasUnpaidConsumptions = consumptions.some(c => c.status === 'pending');
    
    // Calcular dias restantes até o check-out (apenas se houver data de check-out)
    let daysUntilCheckout = null;
    let isCheckoutSoon = false;
    
    if (reservation.check_out_date) {
      daysUntilCheckout = Math.ceil((new Date(reservation.check_out_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      isCheckoutSoon = daysUntilCheckout <= 1 && daysUntilCheckout >= 0 && reservation.status === 'checked_in';
    }
    
    switch (reservation.status) {
      case 'confirmed':
        return {
          title: 'Realizar Check-in',
          description: 'O hóspede está pronto para entrar no quarto.',
          action: () => setShowCheckInModal(true),
          icon: LogIn,
          color: 'blue'
        };
      case 'checked_in':
        return {
          title: 'Realizar Check-out',
          description: hasUnpaidConsumptions 
            ? 'Existem consumos pendentes que precisam ser finalizados antes do check-out.' 
            : !reservation.check_out_date
              ? 'Check-out em aberto - sem data definida.'
              : isCheckoutSoon
                ? `O check-out está programado para ${daysUntilCheckout === 0 ? 'hoje' : 'amanhã'}.`
                : 'O hóspede está pronto para deixar o quarto.',
          action: () => setShowCheckOutModal(true),
          icon: LogOut,
          color: hasUnpaidConsumptions ? 'yellow' : 'blue',
          warning: hasUnpaidConsumptions
        };
      case 'checked_out':
        return {
          title: 'Reserva Finalizada',
          description: 'Esta reserva já foi finalizada com sucesso.',
          icon: CheckCircle,
          color: 'green'
        };
      case 'cancelled':
        return {
          title: 'Reserva Cancelada',
          description: 'Esta reserva foi cancelada.',
          icon: Info,
          color: 'gray'
        };
      default:
        return null;
    }
  };

  const getGuestName = (guest: any) => {
    if (!guest) return 'Hóspede indefinido';
    return guest.client_type === 'individual'
      ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Nome não informado'
      : guest.trade_name || guest.company_name || 'Empresa';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 inline-flex items-start">
          <AlertTriangle className="h-6 w-6 text-red-600 mr-3 mt-0.5" />
          <div className="text-left">
            <h3 className="text-lg font-medium text-red-800 mb-2">Erro ao carregar reserva</h3>
            <p className="text-red-700">{error || 'Reserva não encontrada'}</p>
          </div>
        </div>
        <Link href="/dashboard/reservations" className="btn-primary">
          Voltar para Reservas
        </Link>
      </div>
    )
  }

  const hasUnpaidConsumptions = consumptions.some(c => c.status === 'pending');
  const nextAction = getNextAction();
  
  // Calcular dias restantes até o check-out (apenas se houver data de check-out)
  let daysUntilCheckout = null;
  let isCheckoutSoon = false;
  
  // Calcular precificação e alertas para check-out tardio
  const pricing = reservation && hotelSettings && reservation.status === 'checked_in' && reservation.check_out_date
    ? calculateCheckoutPricing(
        reservation.check_in_date,
        reservation.check_out_date,
        hotelSettings.check_out_time,
        reservation.room?.price_per_night || 0,
        reservation.total_amount
      )
    : null;

  // Determinar se está no período de tolerância gratuita (atrasado em relação ao check_out_time, mas <= 2 horas de atraso)
  let isInGracePeriod = false;
  let gracePeriodLimitStr = '';
  if (reservation && hotelSettings && reservation.status === 'checked_in' && reservation.check_out_date) {
    const localIso = getLocalISOString();
    const now = new Date(localIso);
    const scheduledCheckOutDate = new Date(reservation.check_out_date + 'T00:00:00');
    const timeClean = hotelSettings.check_out_time ? hotelSettings.check_out_time.slice(0, 5) : '12:00';
    const [hours, minutes] = timeClean.split(':').map(Number);
    const scheduledCheckOutDateTime = new Date(scheduledCheckOutDate);
    scheduledCheckOutDateTime.setHours(hours, minutes, 0, 0);
    const gracePeriodDateTime = new Date(scheduledCheckOutDateTime.getTime() + 2 * 60 * 60 * 1000);
    
    isInGracePeriod = now > scheduledCheckOutDateTime && now <= gracePeriodDateTime;
    gracePeriodLimitStr = gracePeriodDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
              disabled={actionLoading}
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
              <LogIn className="h-5 w-5 text-blue-600" />
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
              <LogOut className="h-5 w-5 text-purple-600" />
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
                R$ {(pricing?.isLate ? pricing.recalculatedStayAmount : reservation.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Next Action and Alerts */}
      {pricing && pricing.isLate && (
        pricing.hoursExceeded <= 4 ? (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
            <div>
              <p className="text-orange-800 font-medium">Check-out em Atraso (Tolerância Excedida)</p>
              <p className="text-orange-700 text-sm mt-1">
                O horário limite de check-out com tolerância de 2 horas foi ultrapassado por <strong>{pricing.hoursExceeded} hora(s)</strong>. 
                Será cobrada uma taxa adicional de <strong>R$ {pricing.lateCheckoutFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> (diária proporcional fracionada de 1/12 por hora).
                {hasUnpaidConsumptions && ' Existem consumos pendentes que precisam ser finalizados.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Check-out Tardio (Cobrança de Diária Cheia)</p>
              <p className="text-red-700 text-sm mt-1">
                O check-out ultrapassou o limite máximo de 4 horas extras além da tolerância. 
                Será cobrada <strong>1 diária cheia adicional</strong> no valor de <strong>R$ {pricing.pricePerNight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.
                {hasUnpaidConsumptions && ' Existem consumos pendentes que precisam ser finalizados.'}
              </p>
            </div>
          </div>
        )
      )}

      {isInGracePeriod && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
          <Clock className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Check-out em Atraso (Período de Tolerância)</p>
            <p className="text-yellow-700 text-sm mt-1">
              O horário limite de check-out foi excedido, mas o hóspede está dentro da tolerância gratuita de 2 horas (até as {gracePeriodLimitStr}). Nenhuma taxa extra será cobrada se o check-out for realizado agora.
              {hasUnpaidConsumptions && ' Existem consumos pendentes que precisam ser finalizados.'}
            </p>
          </div>
        </div>
      )}

      {pricing && pricing.isImminent && !isInGracePeriod && !pricing.isLate && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
          <Clock className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Check-out Iminente</p>
            <p className="text-yellow-700 text-sm mt-1">
              O check-out está programado para hoje. Faltam aproximadamente <strong>{Math.ceil(pricing.hoursUntilCheckout)} hora(s)</strong> para o horário limite ({hotelSettings?.check_out_time?.slice(0, 5) || '12:00'}).
              {hasUnpaidConsumptions && ' Existem consumos pendentes que precisam ser finalizados.'}
            </p>
          </div>
        </div>
      )}

      {!pricing?.isLate && !pricing?.isImminent && !isInGracePeriod && isCheckoutSoon && reservation.check_out_date && (
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
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="md:col-span-2">
          {/* This will be populated by the client component */}
        </div>
        
        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          {/* Actions Card */}
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
              onFinalizeConsumptions={handleFinalizeConsumptions}
              hasUnpaidConsumptions={hasUnpaidConsumptions}
              consumptions={consumptions}
              isValidStatusTransition={(current: string, target: string) => isValidStatusTransition(current as any, target as any)}
              getTransitionErrorMessage={(current: string, target: string) => getTransitionErrorMessage(current as any, target as any)}
              validateStatusTransitionRequirements={(current: string, target: string, data: any, cons?: any[]) => validateStatusTransitionRequirements(current as any, target as any, data, cons)}
            />
          </div>
          
          {/* Next Action Card */}
          {nextAction && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Próxima Ação Recomendada
              </h2>
              
              <div className={nextAction.warning 
                ? "p-4 rounded-lg bg-yellow-50" 
                : nextAction.color === "blue" 
                  ? "p-4 rounded-lg bg-blue-50"
                  : nextAction.color === "green"
                    ? "p-4 rounded-lg bg-green-50"
                    : "p-4 rounded-lg bg-gray-50"
              }>
                <div className="flex items-start">
                  {nextAction.icon && (
                    <nextAction.icon className={nextAction.warning 
                      ? "h-5 w-5 mr-3 mt-0.5 text-yellow-600" 
                      : nextAction.color === "blue" 
                        ? "h-5 w-5 mr-3 mt-0.5 text-blue-600"
                        : nextAction.color === "green"
                          ? "h-5 w-5 mr-3 mt-0.5 text-green-600"
                          : "h-5 w-5 mr-3 mt-0.5 text-gray-600"
                    } />
                  )}
                  <div>
                    <h3 className={nextAction.warning 
                      ? "font-medium text-yellow-800" 
                      : nextAction.color === "blue" 
                        ? "font-medium text-blue-800"
                        : nextAction.color === "green"
                          ? "font-medium text-green-800"
                          : "font-medium text-gray-800"
                    }>
                      {nextAction.title}
                    </h3>
                    <p className={nextAction.warning 
                      ? "text-sm mt-1 text-yellow-700" 
                      : nextAction.color === "blue" 
                        ? "text-sm mt-1 text-blue-700"
                        : nextAction.color === "green"
                          ? "text-sm mt-1 text-green-700"
                          : "text-sm mt-1 text-gray-700"
                    }>
                      {nextAction.description}
                    </p>
                    
                    {nextAction.action && (
                      <button
                        onClick={nextAction.action}
                        disabled={actionLoading}
                        className={nextAction.warning 
                          ? "mt-3 px-4 py-2 rounded-md text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white" 
                          : "mt-3 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
                        }
                      >
                        {actionLoading ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processando...
                          </div>
                        ) : (
                          nextAction.title
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content - Guest and Room Details */}
      <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informações do Hóspede
            </h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nome</p>
                  <p className="font-medium">{getGuestName(reservation.guest)}</p>
                </div>
              </div>
              
              {reservation.guest.email && (
                <div className="flex items-start">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <Mail className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{reservation.guest.email}</p>
                  </div>
                </div>
              )}
              
              {reservation.guest.phone && (
                <div className="flex items-start">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <Phone className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Telefone</p>
                    <p className="font-medium">{reservation.guest.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informações do Quarto
            </h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                  <Bed className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quarto</p>
                  <p className="font-medium">{reservation.room.room_number} - {reservation.room.room_type}</p>
                </div>
              </div>
              
              {reservation.special_requests && (
                <div className="flex items-start">
                  <div className="p-2 bg-orange-100 rounded-lg mr-3">
                    <FileText className="h-4 w-4 text-orange-600" />
                  </div>
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
      
      {/* Modals */}
      <CheckInModal
        reservation={reservation}
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onConfirm={handleCheckIn}
      />
      
      <CheckOutModal
        reservation={reservation}
        consumptions={consumptions}
        isOpen={showCheckOutModal}
        onClose={() => setShowCheckOutModal(false)}
        onConfirm={handleCheckOut}
        onFinalizeConsumptions={handleFinalizeConsumptions}
        hotelSettings={hotelSettings}
      />
      
      <CancelReservationModal
        reservation={reservation}
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
      />
    </div>
  )
}