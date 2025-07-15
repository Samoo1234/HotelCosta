'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, User, Bed, DollarSign, FileText, Phone, Mail, MapPin, Edit, Trash2, ShoppingCart, CreditCard } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency, calculateNights, formatDate, createTimezoneAwareDate, getLocalISOString } from '@/lib/utils'

interface Guest {
  id: string
  client_type: 'individual' | 'company'
  first_name: string | null
  last_name: string | null
  company_name: string | null
  trade_name: string | null
  contact_person: string | null
  email: string
  phone: string
  nationality: string
  document_type: string
  document_number: string
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
}

interface Room {
  id: string
  room_number: string
  room_type: string
  capacity: number
  price_per_night: number
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
  amenities: string[] | null
  description: string | null
}

interface Reservation {
  id: string
  guest_id: string
  room_id: string
  check_in_date: string
  check_out_date: string
  total_amount: number
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
  special_requests: string | null
  created_at: string
  updated_at: string
  guest: Guest
  room: Room
}

interface Product {
  id: string
  name: string
  price: number
  unit: string
  category?: {
    name: string
  }
}

interface RoomConsumption {
  id: string
  reservation_id: string
  room_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_amount: number
  consumption_date: string
  payment_responsibility: 'guest' | 'company'
  status: 'pending' | 'billed' | 'paid' | 'cancelled'
  notes: string | null
  registered_by: string | null
  created_at: string
  product: Product
}

const STATUS_COLORS = {
  confirmed: 'bg-blue-100 text-blue-800',
  checked_in: 'bg-green-100 text-green-800',
  checked_out: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-yellow-100 text-yellow-800'
}

const STATUS_LABELS = {
  confirmed: 'Confirmada',
  checked_in: 'Check-in',
  checked_out: 'Check-out',
  cancelled: 'Cancelada',
  no_show: 'Não Compareceu'
}

export default function ReservationDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [hotelSettings, setHotelSettings] = useState<{check_in_time: string, check_out_time: string, timezone?: string} | null>(null)
  const [consumptions, setConsumptions] = useState<RoomConsumption[]>([])
  const [consumptionsLoading, setConsumptionsLoading] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchReservation()
      loadHotelSettings()
      fetchConsumptions()
    }
  }, [params.id])

  const fetchReservation = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guest:guests(*),
          room:rooms(*)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      if (!data) throw new Error('Reserva não encontrada')

      setReservation(data)
    } catch (error) {
      toast.error('Erro ao carregar reserva')
      console.error('Error:', error)
      router.push('/dashboard/reservations')
    } finally {
      setLoading(false)
    }
  }

  const loadHotelSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('check_in_time, check_out_time')
        .single()

      if (error) throw error
      
      setHotelSettings({
        check_in_time: data.check_in_time || '14:00',
        check_out_time: data.check_out_time || '12:00'
      })
    } catch (error) {
      console.error('Error loading hotel settings:', error)
      // Definir valores padrão em caso de erro
      setHotelSettings({
        check_in_time: '14:00',
        check_out_time: '12:00'
      })
    }
  }

  const fetchConsumptions = async () => {
    if (!params.id) return
    
    setConsumptionsLoading(true)
    try {
      const { data, error } = await supabase
        .from('room_consumptions')
        .select(`
          *,
          product:products(
            *,
            category:product_categories(*)
          )
        `)
        .eq('reservation_id', params.id)
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

  const handleDelete = async () => {
    if (!reservation) return

    setDeleteLoading(true)
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservation.id)

      if (error) throw error

      toast.success('Reserva excluída com sucesso!')
      router.push('/dashboard/reservations')
    } catch (error) {
      toast.error('Erro ao excluir reserva')
      console.error('Error:', error)
    } finally {
      setDeleteLoading(false)
      setShowDeleteModal(false)
    }
  }

  const updateConsumptionStatus = async (consumptionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('room_consumptions')
        .update({ status: newStatus })
        .eq('id', consumptionId)

      if (error) throw error
      
      // Atualizar o estado local
      setConsumptions(prev => prev.map(c => 
        c.id === consumptionId ? { ...c, status: newStatus as any } : c
      ))
      
      toast.success('Status atualizado com sucesso!')
    } catch (error) {
      console.error('Error updating consumption status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const finalizeBilling = async () => {
    const pendingConsumptions = consumptions.filter(c => c.status === 'pending')
    
    if (pendingConsumptions.length === 0) {
      toast.error('Não há consumos pendentes para faturar')
      return
    }

    try {
      const { error } = await supabase
        .from('room_consumptions')
        .update({ status: 'billed' })
        .eq('reservation_id', params.id)
        .eq('status', 'pending')

      if (error) throw error
      
      // Atualizar o estado local
      setConsumptions(prev => prev.map(c => 
        c.status === 'pending' ? { ...c, status: 'billed' } : c
      ))
      
      toast.success(`${pendingConsumptions.length} consumo(s) faturado(s) com sucesso!`)
    } catch (error) {
      console.error('Error billing consumptions:', error)
      toast.error('Erro ao faturar consumos')
    }
  }

  const getGuestName = (guest: Guest | null | undefined) => {
    if (!guest) return 'Hóspede indefinido'
    return guest.client_type === 'individual'
      ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Nome não informado'
      : guest.trade_name || guest.company_name || 'Empresa'
  }

  const getNights = (checkIn: string, checkOut: string) => {
    if (!hotelSettings) {
      // Fallback para o cálculo antigo se as configurações não estiverem carregadas
      const checkInDate = new Date(checkIn)
      const checkOutDate = new Date(checkOut)
      return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    }
    
    const checkInDateTime = new Date(`${checkIn}T${hotelSettings.check_in_time}:00`)
    const checkOutDateTime = new Date(`${checkOut}T${hotelSettings.check_out_time}:00`)
    const diffMs = checkOutDateTime.getTime() - checkInDateTime.getTime()
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }

  const getDaysUntilCheckIn = (checkInDate: string) => {
    const today = new Date()
    const checkIn = new Date(checkInDate)
    const diffTime = checkIn.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getConsumptionStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      billed: { label: 'Faturado', color: 'bg-blue-100 text-blue-800' },
      paid: { label: 'Pago', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getPaymentResponsibilityBadge = (responsibility: string, clientType: string) => {
    const isCompany = clientType === 'company'
    
    if (responsibility === 'company') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Empresa
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Hóspede
        </span>
      )
    }
  }

  // Função para processar check-out consolidado
  const processCheckout = async () => {
    if (!reservation) return
    
    try {
      const totalAmount = reservation.total_amount + consumptions.reduce((sum, c) => sum + c.total_amount, 0)
      
      // Criar pagamento consolidado
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          reservation_id: reservation.id,
          amount: totalAmount,
          payment_method: 'checkout', // ou outro método padrão
          payment_date: getLocalISOString(hotelSettings?.timezone || 'America/Sao_Paulo'),
          status: 'completed',
          notes: `Check-out consolidado - Hospedagem: ${formatCurrency(reservation.total_amount)} + Consumos: ${formatCurrency(consumptions.reduce((sum, c) => sum + c.total_amount, 0))}`
        })
        .select()
        .single()
      
      if (paymentError) throw paymentError
      
      // Marcar todos os consumos como pagos
      if (consumptions.length > 0) {
        const { error: consumptionsError } = await supabase
          .from('room_consumptions')
          .update({ status: 'paid' })
          .eq('reservation_id', reservation.id)
        
        if (consumptionsError) throw consumptionsError
      }
      
      // Atualizar status da reserva para checked_out
      const { error: reservationError } = await supabase
        .from('reservations')
        .update({ 
          status: 'checked_out',
          updated_at: getLocalISOString(hotelSettings?.timezone || 'America/Sao_Paulo')
        })
        .eq('id', reservation.id)
      
      if (reservationError) throw reservationError
      
      toast.success('Check-out realizado com sucesso!')
      
      // Recarregar dados
      await Promise.all([
        fetchReservation(),
        fetchConsumptions()
      ])
      
    } catch (error) {
      toast.error('Erro ao processar check-out')
      console.error('Error processing checkout:', error)
    }
  }
  
  // Função para obter status do pagamento consolidado
  const getPaymentStatusBadge = () => {
    const hasUnpaidConsumptions = consumptions.some(c => c.status === 'pending')
    const isCheckedOut = reservation.status === 'checked_out'
    
    if (isCheckedOut) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Conta Finalizada
        </span>
      )
    } else if (hasUnpaidConsumptions) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Consumos Pendentes
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Pronto para Check-out
        </span>
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Reserva não encontrada</h3>
        <Link href="/dashboard/reservations" className="btn-primary">
          Voltar para Reservas
        </Link>
      </div>
    )
  }

  const nights = getNights(reservation.check_in_date, reservation.check_out_date)
  const daysUntilCheckIn = getDaysUntilCheckIn(reservation.check_in_date)

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
            <h1 className="text-3xl font-bold text-gray-900">
              Reserva #{reservation.id.slice(-8)}
            </h1>
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
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </button>
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
              <p className="text-sm font-medium text-gray-600">Status</p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                STATUS_COLORS[reservation.status]
              }`}>
                {STATUS_LABELS[reservation.status]}
              </span>
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
              <p className="text-lg font-bold text-gray-900">{nights}</p>
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
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Check-in</p>
              <p className="text-sm font-bold text-gray-900">
                {daysUntilCheckIn === 0 ? 'Hoje' : 
                 daysUntilCheckIn === 1 ? 'Amanhã' : 
                 daysUntilCheckIn > 0 ? `Em ${daysUntilCheckIn} dias` : 
                 `${Math.abs(daysUntilCheckIn)} dias atrás`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Informações do Hóspede
          </h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Nome</p>
              <p className="font-medium text-gray-900">
                {getGuestName(reservation.guest)}
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  reservation.guest.client_type === 'individual' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {reservation.guest.client_type === 'individual' ? 'PF' : 'PJ'}
                </span>
              </p>
            </div>
            
            {reservation.guest.client_type === 'company' && reservation.guest.contact_person && (
              <div>
                <p className="text-sm text-gray-600">Pessoa de Contato</p>
                <p className="font-medium text-gray-900">{reservation.guest.contact_person}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </p>
                <p className="font-medium text-gray-900">{reservation.guest.email}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  Telefone
                </p>
                <p className="font-medium text-gray-900">{reservation.guest.phone}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Documento</p>
                <p className="font-medium text-gray-900">
                  {reservation.guest.document_type}: {reservation.guest.document_number}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Nacionalidade</p>
                <p className="font-medium text-gray-900">{reservation.guest.nationality}</p>
              </div>
            </div>
            
            {reservation.guest.address && (
              <div>
                <p className="text-sm text-gray-600 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  Endereço
                </p>
                <p className="font-medium text-gray-900">
                  {reservation.guest.address}
                  {reservation.guest.city && `, ${reservation.guest.city}`}
                  {reservation.guest.state && `, ${reservation.guest.state}`}
                  {reservation.guest.zip_code && ` - ${reservation.guest.zip_code}`}
                </p>
              </div>
            )}
            
            <div className="pt-4 border-t">
              <Link
                href={`/dashboard/guests/${reservation.guest.id}/details`}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Ver perfil completo do hóspede →
              </Link>
            </div>
          </div>
        </div>

        {/* Room Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Bed className="h-5 w-5 mr-2" />
            Informações do Quarto
          </h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Número do Quarto</p>
              <p className="text-2xl font-bold text-gray-900">{reservation.room.room_number}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <p className="font-medium text-gray-900">{reservation.room.room_type}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Capacidade</p>
                <p className="font-medium text-gray-900">{reservation.room.capacity} pessoa{reservation.room.capacity !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Preço por Noite</p>
              <p className="text-lg font-bold text-gray-900">
                R$ {reservation.room.price_per_night.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            {reservation.room.description && (
              <div>
                <p className="text-sm text-gray-600">Descrição</p>
                <p className="text-gray-900">{reservation.room.description}</p>
              </div>
            )}
            
            {reservation.room.amenities && reservation.room.amenities.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Comodidades</p>
                <div className="flex flex-wrap gap-2">
                  {reservation.room.amenities.map((amenity, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t">
              <Link
                href={`/dashboard/rooms/${reservation.room.id}/details`}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Ver detalhes completos do quarto →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Reservation Details */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Detalhes da Reserva
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600">Data de Check-in</p>
            <p className="text-lg font-medium text-gray-900">
              {new Date(reservation.check_in_date).toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Data de Check-out</p>
            <p className="text-lg font-medium text-gray-900">
              {new Date(reservation.check_out_date).toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Duração</p>
            <p className="text-lg font-medium text-gray-900">
              {nights} noite{nights !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Valor por Noite</p>
            <p className="text-lg font-medium text-gray-900">
              R$ {(reservation.total_amount / nights).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        
        {reservation.special_requests && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600 mb-2 flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              Solicitações Especiais
            </p>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
              {reservation.special_requests}
            </p>
          </div>
        )}
        
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p>Reserva criada em:</p>
              <p className="font-medium text-gray-900">
                {new Date(reservation.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p>Última atualização:</p>
              <p className="font-medium text-gray-900">
                {new Date(reservation.updated_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Consumptions Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Consumos da Reserva
          </h2>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/consumptions/new?reservation_id=${reservation.id}`}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Novo Consumo
            </Link>
            {consumptions.some(c => c.status === 'pending') && (
              <button
                onClick={finalizeBilling}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Finalizar Faturamento
              </button>
            )}
          </div>
        </div>

        {consumptionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : consumptions.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum consumo registrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Esta reserva ainda não possui consumos registrados.
            </p>
            <div className="mt-6">
              <Link
                href={`/dashboard/consumptions/new?reservation_id=${reservation.id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <ShoppingCart className="-ml-1 mr-2 h-4 w-4" />
                Registrar Primeiro Consumo
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responsável
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {consumptions.map((consumption) => (
                  <tr key={consumption.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {consumption.product.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {consumption.product.category?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {consumption.quantity} {consumption.product.unit}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(consumption.unit_price)} cada
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(consumption.total_amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentResponsibilityBadge(
                        consumption.payment_responsibility,
                        reservation.guest.client_type
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getConsumptionStatusBadge(consumption.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(consumption.consumption_date || consumption.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {consumption.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateConsumptionStatus(consumption.id, 'billed')}
                              className="text-blue-600 hover:text-blue-900 text-xs px-2 py-1 rounded"
                            >
                              Faturar
                            </button>
                            <button
                              onClick={() => updateConsumptionStatus(consumption.id, 'cancelled')}
                              className="text-red-600 hover:text-red-900 text-xs px-2 py-1 rounded"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                        {consumption.status === 'billed' && (
                          <button
                            onClick={() => updateConsumptionStatus(consumption.id, 'paid')}
                            className="text-green-600 hover:text-green-900 text-xs px-2 py-1 rounded"
                          >
                            Marcar Pago
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Resumo dos Consumos */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total de Consumos:</span>
                  <span className="font-medium text-gray-900 ml-2">
                    {consumptions.length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Valor Total:</span>
                  <span className="font-medium text-gray-900 ml-2">
                    {formatCurrency(
                      consumptions.reduce((sum, c) => sum + c.total_amount, 0)
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Pendentes:</span>
                  <span className="font-medium text-yellow-600 ml-2">
                    {consumptions.filter(c => c.status === 'pending').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Consolidated Billing Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Conta Consolidada da Hospedagem
          </h2>
          {reservation.status === 'checked_in' && (
            <div className="flex gap-2">
              <button
                onClick={processCheckout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Finalizar Check-out
              </button>
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <div className="space-y-4">
            {/* Hospedagem */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-900 font-medium">Hospedagem</span>
                <div className="text-sm text-gray-500">
                  {getNights(reservation.check_in_date, reservation.check_out_date)} noite(s) × {formatCurrency(reservation.room.price_per_night)}
                </div>
              </div>
              <span className="text-gray-900 font-medium">
                {formatCurrency(reservation.total_amount)}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm font-medium text-gray-900 mb-2">Consumos:</div>
              {consumptions.length === 0 ? (
                <div className="text-sm text-gray-500 italic">Nenhum consumo registrado</div>
              ) : (
                <div className="space-y-2">
                  {consumptions.map((consumption) => (
                    <div key={consumption.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">
                          {consumption.product.name} × {consumption.quantity}
                        </span>
                        {getConsumptionStatusBadge(consumption.status)}
                      </div>
                      <span className="text-gray-900">
                        {formatCurrency(consumption.total_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subtotais */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal Hospedagem:</span>
                <span className="text-gray-900">{formatCurrency(reservation.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal Consumos:</span>
                <span className="text-gray-900">
                  {formatCurrency(consumptions.reduce((sum, c) => sum + c.total_amount, 0))}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                <span className="text-gray-900">TOTAL GERAL:</span>
                <span className="text-gray-900">
                  {formatCurrency(
                    reservation.total_amount + consumptions.reduce((sum, c) => sum + c.total_amount, 0)
                  )}
                </span>
              </div>
            </div>

            {/* Status do Pagamento */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status do Pagamento:</span>
                <div className="flex items-center gap-2">
                  {getPaymentStatusBadge()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Exclusão
            </h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir esta reserva? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Excluindo...
                  </div>
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}