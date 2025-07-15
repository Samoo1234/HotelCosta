'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Filter, Calendar, User, Bed, DollarSign, Clock, Eye, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

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

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = searchTerm === '' || 
      getGuestName(reservation.guest).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.room?.room_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.guest?.email || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter

    let matchesDate = true
    if (dateFilter !== 'all') {
      // Use timezone-aware date for comparison
      const today = new Date()
      const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const checkInDate = new Date(reservation.check_in_date + 'T00:00:00')
      
      switch (dateFilter) {
        case 'today':
          matchesDate = checkInDate.toDateString() === todayLocal.toDateString()
          break
        case 'week':
          const weekFromNow = new Date(todayLocal.getTime() + 7 * 24 * 60 * 60 * 1000)
          matchesDate = checkInDate >= todayLocal && checkInDate <= weekFromNow
          break
        case 'month':
          const monthFromNow = new Date(todayLocal.getFullYear(), todayLocal.getMonth() + 1, todayLocal.getDate())
          matchesDate = checkInDate >= todayLocal && checkInDate <= monthFromNow
          break
      }
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    checkedIn: reservations.filter(r => r.status === 'checked_in').length,
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
          
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="confirmed">Confirmada</option>
            <option value="checked_in">Check-in</option>
            <option value="checked_out">Check-out</option>
            <option value="cancelled">Cancelada</option>
            <option value="no_show">Não Compareceu</option>
          </select>
          
          <select
            className="input"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">Todas as Datas</option>
            <option value="today">Hoje</option>
            <option value="week">Próximos 7 dias</option>
            <option value="month">Próximo mês</option>
          </select>
          
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-2" />
            {filteredReservations.length} de {reservations.length} reservas
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
                  
                  return (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {getGuestName(reservation.guest)}
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
                        {getStatusBadge(reservation.status)}
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
                          <Link
                            href={`/dashboard/reservations/${reservation.id}/details`}
                            className="text-primary-600 hover:text-primary-900"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/reservations/${reservation.id}`}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => deleteReservation(reservation.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  )
}