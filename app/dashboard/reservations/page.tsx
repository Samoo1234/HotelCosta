'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Filter, Calendar, User, Bed, DollarSign, Clock, Eye, Edit, Trash2, AlertTriangle, Bell, LogIn, LogOut, X } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ReservationStatus from '@/components/dashboard/ReservationStatus'
import CheckInModal from '@/components/dashboard/CheckInModal'
import CheckOutModal from '@/components/dashboard/CheckOutModal'
import CancelReservationModal from '@/components/dashboard/CancelReservationModal'
import { performCheckIn, performCheckOut, cancelReservation, hasUnpaidConsumptions, finalizeConsumptions } from '@/app/dashboard/reservations/[id]/details/actions'

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
}

interface Guest {
  id: string
  client_type: 'individual' | 'company'
  first_name: string | null
  last_name: string | null
  company_name: string | null
  trade_name: string | null
  email: string
  phone: string
}

interface Room {
  id: string
  room_number: string
  room_type: string
  price_per_night: number
}

interface ReservationWithDetails extends Reservation {
  guest: Guest
  room: Room
}

const STATUS_COLORS = {
  confirmed: 'bg-blue-100 text-blue-800',
  checked_in: 'bg-green-100 text-green-800',
  checked_out: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800'
}

const STATUS_LABELS = {
  confirmed: 'Confirmada',
  checked_in: 'Check-in',
  checked_out: 'Check-out',
  cancelled: 'Cancelada',
  no_show: 'Não Compareceu'
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState(false)
  
  // Modal states
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null)
  const [checkInModalOpen, setCheckInModalOpen] = useState(false)
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [hasConsumptions, setHasConsumptions] = useState(false)
  const [consumptions, setConsumptions] = useState<any[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    fetchReservations()
  }, [])

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guest:guests(*),
          room:rooms(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReservations(data || [])
    } catch (error) {
      toast.error('Erro ao carregar reservas')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteReservation = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta reserva?')) return

    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id)

      if (error) throw error

      setReservations(reservations.filter(r => r.id !== id))
      toast.success('Reserva excluída com sucesso!')
    } catch (error) {
      toast.error('Erro ao excluir reserva')
      console.error('Error:', error)
    }
  }
  
  // Function to open check-in modal
  const openCheckInModal = async (reservation: ReservationWithDetails) => {
    setSelectedReservation(reservation)
    setCheckInModalOpen(true)
  }
  
  // Function to open check-out modal
  const openCheckOutModal = async (reservation: ReservationWithDetails) => {
    setSelectedReservation(reservation)
    
    try {
      // Check if there are unpaid consumptions
      const hasUnpaid = await hasUnpaidConsumptions(reservation.id)
      setHasConsumptions(hasUnpaid)
      
      // Fetch consumptions
      const { data, error } = await supabase
        .from('room_consumptions')
        .select(`
          *,
          product:products(*)
        `)
        .eq('reservation_id', reservation.id)
      
      if (error) throw error
      setConsumptions(data || [])
      
      // Open modal
      setCheckOutModalOpen(true)
    } catch (error) {
      toast.error('Erro ao verificar consumos')
      console.error('Error:', error)
    }
  }
  
  // Function to open cancel modal
  const openCancelModal = (reservation: ReservationWithDetails) => {
    setSelectedReservation(reservation)
    setCancelModalOpen(true)
  }
  
  // Function to handle check-in
  const handleCheckIn = async () => {
    if (!selectedReservation) return
    
    setActionLoading(true)
    try {
      await performCheckIn(selectedReservation.id)
      
      // Update reservation in the list
      const updatedReservations = reservations.map(r => 
        r.id === selectedReservation.id ? { ...r, status: 'checked_in' as const } : r
      )
      setReservations(updatedReservations)
      
      toast.success('Check-in realizado com sucesso!')
      setCheckInModalOpen(false)
    } catch (error: any) {
      toast.error(`Erro ao realizar check-in: ${error.message || 'Erro desconhecido'}`)
      console.error('Error:', error)
    } finally {
      setActionLoading(false)
    }
  }
  
  // Function to handle check-out
  const handleCheckOut = async () => {
    if (!selectedReservation) return
    
    setActionLoading(true)
    try {
      await performCheckOut(selectedReservation.id, consumptions)
      
      // Update reservation in the list
      const updatedReservations = reservations.map(r => 
        r.id === selectedReservation.id ? { ...r, status: 'checked_out' as const } : r
      )
      setReservations(updatedReservations)
      
      toast.success('Check-out realizado com sucesso!')
      setCheckOutModalOpen(false)
    } catch (error: any) {
      toast.error(`Erro ao realizar check-out: ${error.message || 'Erro desconhecido'}`)
      console.error('Error:', error)
    } finally {
      setActionLoading(false)
    }
  }
  
  // Function to handle cancel
  const handleCancel = async (reason: string) => {
    if (!selectedReservation) return
    
    setActionLoading(true)
    try {
      await cancelReservation(selectedReservation.id, reason)
      
      // Update reservation in the list
      const updatedReservations = reservations.map(r => 
        r.id === selectedReservation.id ? { ...r, status: 'cancelled' as const } : r
      )
      setReservations(updatedReservations)
      
      toast.success('Reserva cancelada com sucesso!')
      setCancelModalOpen(false)
    } catch (error: any) {
      toast.error(`Erro ao cancelar reserva: ${error.message || 'Erro desconhecido'}`)
      console.error('Error:', error)
    } finally {
      setActionLoading(false)
    }
  }
  
  // Function to handle finalize consumptions
  const handleFinalizeConsumptions = async () => {
    if (!selectedReservation) return
    
    setActionLoading(true)
    try {
      await finalizeConsumptions(selectedReservation.id)
      
      // Refresh consumptions
      const { data, error } = await supabase
        .from('room_consumptions')
        .select(`
          *,
          product:products(*)
        `)
        .eq('reservation_id', selectedReservation.id)
      
      if (error) throw error
      setConsumptions(data || [])
      setHasConsumptions(false)
      
      toast.success('Consumos finalizados com sucesso!')
    } catch (error: any) {
      toast.error(`Erro ao finalizar consumos: ${error.message || 'Erro desconhecido'}`)
      console.error('Error:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const getGuestName = (guest: Guest | null | undefined) => {
    if (!guest) return 'Hóspede indefinido'
    
    return guest.client_type === 'individual'
      ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Nome não informado'
      : guest.trade_name || guest.company_name || 'Empresa'
  }

  const getStatusBadge = (status: string) => {
    const colorClass = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'
    const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {label}
      </span>
    )
  }

  // Helper function to check if a reservation needs attention
  const needsAttention = (reservation: ReservationWithDetails) => {
    const today = new Date()
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    // Check if check-out is today or tomorrow for checked-in reservations
    if (reservation.status === 'checked_in') {
      const checkOutDate = new Date(reservation.check_out_date + 'T00:00:00')
      const tomorrowLocal = new Date(todayLocal.getTime() + 24 * 60 * 60 * 1000)
      
      return checkOutDate.toDateString() === todayLocal.toDateString() || 
             checkOutDate.toDateString() === tomorrowLocal.toDateString()
    }
    
    // Check if check-in is today for confirmed reservations
    if (reservation.status === 'confirmed') {
      const checkInDate = new Date(reservation.check_in_date + 'T00:00:00')
      return checkInDate.toDateString() === todayLocal.toDateString()
    }
    
    return false
  }
  
  // Helper function to get attention reason
  const getAttentionReason = (reservation: ReservationWithDetails) => {
    const today = new Date()
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    if (reservation.status === 'checked_in') {
      const checkOutDate = new Date(reservation.check_out_date + 'T00:00:00')
      
      if (checkOutDate.toDateString() === todayLocal.toDateString()) {
        return 'Check-out hoje'
      }
      
      const tomorrowLocal = new Date(todayLocal.getTime() + 24 * 60 * 60 * 1000)
      if (checkOutDate.toDateString() === tomorrowLocal.toDateString()) {
        return 'Check-out amanhã'
      }
    }
    
    if (reservation.status === 'confirmed') {
      const checkInDate = new Date(reservation.check_in_date + 'T00:00:00')
      if (checkInDate.toDateString() === todayLocal.toDateString()) {
        return 'Check-in hoje'
      }
    }
    
    return ''
  }

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = searchTerm === '' || 
      getGuestName(reservation.guest).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.room?.room_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.guest?.email || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'attention' ? needsAttention(reservation) : reservation.status === statusFilter)

    let matchesDate = true
    if (dateFilter !== 'all') {
      // Use timezone-aware date for comparison
      const today = new Date()
      const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const checkInDate = new Date(reservation.check_in_date + 'T00:00:00')
      const checkOutDate = new Date(reservation.check_out_date + 'T00:00:00')
      
      switch (dateFilter) {
        case 'today':
          matchesDate = checkInDate.toDateString() === todayLocal.toDateString()
          break
        case 'tomorrow':
          const tomorrowLocal = new Date(todayLocal.getTime() + 24 * 60 * 60 * 1000)
          matchesDate = checkInDate.toDateString() === tomorrowLocal.toDateString()
          break
        case 'week':
          const weekFromNow = new Date(todayLocal.getTime() + 7 * 24 * 60 * 60 * 1000)
          matchesDate = checkInDate >= todayLocal && checkInDate <= weekFromNow
          break
        case 'month':
          const monthFromNow = new Date(todayLocal.getFullYear(), todayLocal.getMonth() + 1, todayLocal.getDate())
          matchesDate = checkInDate >= todayLocal && checkInDate <= monthFromNow
          break
        case 'checkout-today':
          matchesDate = checkOutDate.toDateString() === todayLocal.toDateString()
          break
      }
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    checkedIn: reservations.filter(r => r.status === 'checked_in').length,
    needsAttention: reservations.filter(r => needsAttention(r)).length,
    revenue: reservations.reduce((sum, r) => sum + r.total_amount, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-600 mt-2">
            Gerencie todas as reservas do hotel
          </p>
        </div>
        <Link href="/dashboard/reservations/new" className="btn-primary flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Nova Reserva
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Reservas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Confirmadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Check-ins</p>
              <p className="text-2xl font-bold text-gray-900">{stats.checkedIn}</p>
            </div>
          </div>
        </div>
        
        <div className="card relative group">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Precisa de Atenção</p>
              <p className="text-2xl font-bold text-amber-600">{stats.needsAttention}</p>
            </div>
          </div>
          <div className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 z-10">
            Reservas que precisam de atenção imediata: check-in hoje, check-out hoje ou amanhã.
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar reservas..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <select
              className="input pr-10 appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="attention" className="text-yellow-600 font-medium">⚠️ Precisa de Atenção</option>
              <optgroup label="Status">
                <option value="confirmed">Confirmada</option>
                <option value="checked_in">Check-in</option>
                <option value="checked_out">Check-out</option>
                <option value="cancelled">Cancelada</option>
                <option value="no_show">Não Compareceu</option>
              </optgroup>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          
          <div className="relative">
            <select
              className="input pr-10 appearance-none"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">Todas as Datas</option>
              <optgroup label="Check-in">
                <option value="today">Check-in Hoje</option>
                <option value="tomorrow">Check-in Amanhã</option>
                <option value="week">Próximos 7 dias</option>
                <option value="month">Próximo mês</option>
              </optgroup>
              <optgroup label="Check-out">
                <option value="checkout-today">Check-out Hoje</option>
              </optgroup>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-2" />
            {filteredReservations.length} de {reservations.length} reservas
            {statusFilter === 'attention' && stats.needsAttention > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                {stats.needsAttention} precisam de atenção
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <div className="card">
        {filteredReservations.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma reserva encontrada</h3>
            <p className="text-gray-600 mb-4">
              {reservations.length === 0 
                ? 'Comece criando sua primeira reserva'
                : 'Tente ajustar os filtros de busca'
              }
            </p>
            <Link href="/dashboard/reservations/new" className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Nova Reserva
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hóspede
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quarto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check-in / Check-out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReservations.map((reservation) => {
                  const checkIn = new Date(reservation.check_in_date + 'T00:00:00')
                  const checkOut = new Date(reservation.check_out_date + 'T00:00:00')
                  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
                  
                  const requiresAttention = needsAttention(reservation);
                  
                  return (
                    <tr 
                      key={reservation.id} 
                      className={`hover:bg-gray-50 ${requiresAttention ? 'bg-yellow-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900">
                                {getGuestName(reservation.guest)}
                              </span>
                              {requiresAttention && (
                                <div className="relative group ml-2">
                                  <span className="flex items-center text-yellow-600">
                                    <AlertTriangle className="h-4 w-4" />
                                  </span>
                                  <div className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 left-full ml-2 w-32 z-10">
                                    {getAttentionReason(reservation)}
                                    <div className="absolute top-1/2 left-0 transform -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {reservation.guest?.email || 'Email não informado'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Bed className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Quarto {reservation.room?.room_number || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {reservation.room?.room_type || 'Tipo não informado'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(checkIn)} - {formatDate(checkOut)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {nights} noite{nights !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ReservationStatus status={reservation.status} size="sm" />
                          {requiresAttention && (
                            <div className="relative group ml-2">
                              <span className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse block"></span>
                              <div className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-32 z-10">
                                {getAttentionReason(reservation)}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          R$ {reservation.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-gray-500">
                          R$ {(reservation.total_amount / nights).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/noite
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Quick action buttons based on status */}
                          {reservation.status === 'confirmed' && (
                            <button
                              onClick={() => openCheckInModal(reservation)}
                              className="bg-green-100 text-green-700 hover:bg-green-200 p-1 rounded-full relative group"
                              title="Realizar Check-in"
                            >
                              <LogIn className="h-4 w-4" />
                              <div className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 right-full mr-2 w-32 z-10">
                                Realizar Check-in
                                <div className="absolute top-1/2 right-0 transform translate-x-1 -translate-y-1/2 border-4 border-transparent border-l-gray-800"></div>
                              </div>
                            </button>
                          )}
                          
                          {reservation.status === 'checked_in' && (
                            <button
                              onClick={() => openCheckOutModal(reservation)}
                              className="bg-gray-100 text-gray-700 hover:bg-gray-200 p-1 rounded-full relative group"
                              title="Realizar Check-out"
                            >
                              <LogOut className="h-4 w-4" />
                              <div className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 right-full mr-2 w-32 z-10">
                                Realizar Check-out
                                <div className="absolute top-1/2 right-0 transform translate-x-1 -translate-y-1/2 border-4 border-transparent border-l-gray-800"></div>
                              </div>
                            </button>
                          )}
                          
                          {(reservation.status === 'confirmed' || reservation.status === 'checked_in') && (
                            <button
                              onClick={() => openCancelModal(reservation)}
                              className="bg-red-100 text-red-700 hover:bg-red-200 p-1 rounded-full relative group"
                              title="Cancelar Reserva"
                            >
                              <X className="h-4 w-4" />
                              <div className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 right-full mr-2 w-32 z-10">
                                Cancelar Reserva
                                <div className="absolute top-1/2 right-0 transform translate-x-1 -translate-y-1/2 border-4 border-transparent border-l-gray-800"></div>
                              </div>
                            </button>
                          )}
                          
                          {/* Standard action buttons */}
                          <Link
                            href={`/dashboard/reservations/${reservation.id}/details`}
                            className="text-primary-600 hover:text-primary-900 relative group"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                            <div className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 right-full mr-2 w-24 z-10">
                              Ver detalhes
                              <div className="absolute top-1/2 right-0 transform translate-x-1 -translate-y-1/2 border-4 border-transparent border-l-gray-800"></div>
                            </div>
                          </Link>
                          
                          <button
                            onClick={() => deleteReservation(reservation.id)}
                            className="text-red-600 hover:text-red-900 relative group"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                            <div className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 right-full mr-2 w-16 z-10">
                              Excluir
                              <div className="absolute top-1/2 right-0 transform translate-x-1 -translate-y-1/2 border-4 border-transparent border-l-gray-800"></div>
                            </div>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Modals */}
      {selectedReservation && (
        <>
          {/* Check-in Modal */}
          <CheckInModal
            reservation={selectedReservation}
            isOpen={checkInModalOpen}
            onClose={() => setCheckInModalOpen(false)}
            onConfirm={handleCheckIn}
          />
          
          {/* Check-out Modal */}
          <CheckOutModal
            reservation={selectedReservation}
            consumptions={consumptions}
            isOpen={checkOutModalOpen}
            onClose={() => setCheckOutModalOpen(false)}
            onConfirm={handleCheckOut}
            onFinalizeConsumptions={handleFinalizeConsumptions}
          />
          
          {/* Cancel Modal */}
          <CancelReservationModal
            reservation={selectedReservation}
            isOpen={cancelModalOpen}
            onClose={() => setCancelModalOpen(false)}
            onConfirm={handleCancel}
          />
        </>
      )}
    </div>
  )
}