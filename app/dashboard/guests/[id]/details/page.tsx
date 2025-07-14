'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, User, Calendar, MapPin, Phone, Mail, FileText, Edit, TrendingUp, Clock, Bed, DollarSign } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

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
  document_type: string
  document_number: string
  address: string | null
  date_of_birth: string | null
  nationality: string
  created_at: string
}

interface Reservation {
  id: string
  check_in_date: string
  check_out_date: string
  total_amount: number
  status: string
  created_at: string
  rooms: {
    number: string
    type: string
  }
}

interface GuestStats {
  total_reservations: number
  total_spent: number
  last_stay: string | null
  first_stay: string | null
  average_stay_duration: number
  favorite_room_type: string | null
  total_nights: number
  average_amount_per_night: number
  reservations_by_status: Record<string, number>
  monthly_spending: Array<{ month: string; amount: number }>
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

export default function GuestDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [stats, setStats] = useState<GuestStats | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchGuestData()
    }
  }, [params.id])

  const fetchGuestData = async () => {
    try {
      // Buscar dados do hóspede
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .select('*')
        .eq('id', params.id)
        .single()

      if (guestError) throw guestError
      setGuest(guestData)

      // Buscar reservas do hóspede
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          id,
          check_in_date,
          check_out_date,
          total_amount,
          status,
          created_at,
          rooms!inner(number, type)
        `)
        .eq('guest_id', params.id)
        .order('check_in_date', { ascending: false })

      if (reservationsError) throw reservationsError
      setReservations(reservationsData || [])

      // Calcular estatísticas
      calculateStats(reservationsData || [])
    } catch (error) {
      toast.error('Erro ao carregar dados do hóspede')
      console.error('Error:', error)
      router.push('/dashboard/guests')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (reservationsData: Reservation[]) => {
    if (!reservationsData.length) {
      setStats({
        total_reservations: 0,
        total_spent: 0,
        last_stay: null,
        first_stay: null,
        average_stay_duration: 0,
        favorite_room_type: null,
        total_nights: 0,
        average_amount_per_night: 0,
        reservations_by_status: {},
        monthly_spending: []
      })
      return
    }

    const totalReservations = reservationsData.length
    const totalSpent = reservationsData.reduce((sum, res) => sum + (res.total_amount || 0), 0)
    
    // Ordenar por data para encontrar primeira e última estadia
    const sortedByDate = [...reservationsData].sort((a, b) => 
      new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime()
    )
    
    const firstStay = sortedByDate[0]?.check_in_date
    const lastStay = sortedByDate[sortedByDate.length - 1]?.check_out_date

    // Calcular total de noites e duração média
    let totalNights = 0
    reservationsData.forEach(res => {
      const checkIn = new Date(res.check_in_date)
      const checkOut = new Date(res.check_out_date)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      totalNights += nights
    })
    
    const averageStayDuration = totalNights / totalReservations
    const averageAmountPerNight = totalNights > 0 ? totalSpent / totalNights : 0

    // Tipo de quarto favorito
    const roomTypeCounts = reservationsData.reduce((acc: Record<string, number>, res) => {
      const roomType = res.rooms?.type || 'Desconhecido'
      acc[roomType] = (acc[roomType] || 0) + 1
      return acc
    }, {})
    
    const favoriteRoomType = Object.entries(roomTypeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null

    // Reservas por status
    const reservationsByStatus = reservationsData.reduce((acc: Record<string, number>, res) => {
      acc[res.status] = (acc[res.status] || 0) + 1
      return acc
    }, {})

    // Gastos mensais (últimos 12 meses)
    const monthlySpending: Array<{ month: string; amount: number }> = []
    const now = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toISOString().slice(0, 7) // YYYY-MM
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      
      const monthAmount = reservationsData
        .filter(res => res.check_in_date.startsWith(monthKey))
        .reduce((sum, res) => sum + (res.total_amount || 0), 0)
      
      monthlySpending.push({ month: monthName, amount: monthAmount })
    }

    setStats({
      total_reservations: totalReservations,
      total_spent: totalSpent,
      last_stay: lastStay,
      first_stay: firstStay,
      average_stay_duration: averageStayDuration,
      favorite_room_type: favoriteRoomType,
      total_nights: totalNights,
      average_amount_per_night: averageAmountPerNight,
      reservations_by_status: reservationsByStatus,
      monthly_spending: monthlySpending
    })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!guest) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Hóspede não encontrado</h2>
        <Link href="/dashboard/guests" className="btn-primary mt-4">
          Voltar para Hóspedes
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/guests"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {guest.client_type === 'individual' 
                ? `${guest.first_name} ${guest.last_name}`
                : guest.trade_name || guest.company_name
              }
            </h1>
            <p className="text-gray-600 mt-2">
              Detalhes completos e histórico de reservas
            </p>
          </div>
        </div>
        
        <Link
          href={`/dashboard/guests/${guest.id}`}
          className="btn-primary"
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar Hóspede
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Overview */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informações do Hóspede
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="h-16 w-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-xl font-semibold text-gray-900">
                      {guest.client_type === 'individual' 
                        ? `${guest.first_name} ${guest.last_name}`
                        : guest.trade_name || guest.company_name
                      }
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                        guest.client_type === 'individual' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {guest.client_type === 'individual' ? 'PF' : 'PJ'}
                      </span>
                      {guest.document_type}: {guest.document_number}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-3" />
                    <span>{guest.email}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-3" />
                    <span>{guest.phone}</span>
                  </div>
                  {guest.client_type === 'individual' && guest.date_of_birth && (
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-3" />
                      <span>{new Date(guest.date_of_birth).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                  {guest.client_type === 'company' && guest.contact_person && (
                    <div className="flex items-center text-gray-600">
                      <User className="h-4 w-4 mr-3" />
                      <span>Contato: {guest.contact_person}</span>
                    </div>
                  )}
                  {guest.client_type === 'company' && guest.trade_name && guest.trade_name !== guest.company_name && (
                    <div className="flex items-center text-gray-600">
                      <FileText className="h-4 w-4 mr-3" />
                      <span>Nome Fantasia: {guest.trade_name}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-600">
                    <FileText className="h-4 w-4 mr-3" />
                    <span>{guest.nationality}</span>
                  </div>
                  {guest.address && (
                    <div className="flex items-start text-gray-600">
                      <MapPin className="h-4 w-4 mr-3 mt-1" />
                      <span>{guest.address}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {stats && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Resumo de Atividade</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats.total_reservations}</div>
                      <div className="text-xs text-blue-600">Reservas</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        R$ {stats.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-green-600">Total Gasto</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{stats.total_nights}</div>
                      <div className="text-xs text-purple-600">Noites</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {Math.round(stats.average_stay_duration)}
                      </div>
                      <div className="text-xs text-orange-600">Dias/Estadia</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reservations History */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Histórico de Reservas ({reservations.length})
            </h2>
            
            {reservations.length > 0 ? (
              <div className="space-y-4">
                {reservations.map((reservation) => {
                  const checkIn = new Date(reservation.check_in_date)
                  const checkOut = new Date(reservation.check_out_date)
                  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
                  
                  return (
                    <div key={reservation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Bed className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              Quarto {reservation.rooms.number} - {reservation.rooms.type}
                            </div>
                            <div className="text-sm text-gray-500">
                              {checkIn.toLocaleDateString('pt-BR')} - {checkOut.toLocaleDateString('pt-BR')} ({nights} noites)
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            R$ {reservation.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          {getStatusBadge(reservation.status)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Reserva criada em {new Date(reservation.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bed className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma reserva encontrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          {stats && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Estatísticas Detalhadas
              </h2>
              
              <div className="space-y-4">
                {stats.first_stay && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Primeira Estadia:</span>
                    <span className="font-medium text-sm">
                      {new Date(stats.first_stay).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                
                {stats.last_stay && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Última Estadia:</span>
                    <span className="font-medium text-sm">
                      {new Date(stats.last_stay).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                
                {stats.favorite_room_type && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Quarto Favorito:</span>
                    <span className="font-medium text-sm">{stats.favorite_room_type}</span>
                  </div>
                )}
                
                {stats.average_amount_per_night > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Valor/Noite:</span>
                    <span className="font-medium text-sm text-green-600">
                      R$ {stats.average_amount_per_night.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Distribution */}
          {stats && Object.keys(stats.reservations_by_status).length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Reservas por Status
              </h2>
              
              <div className="space-y-2">
                {Object.entries(stats.reservations_by_status).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <span className="text-sm">
                      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Spending Chart */}
          {stats && stats.monthly_spending.some(m => m.amount > 0) && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Gastos Mensais
              </h2>
              
              <div className="space-y-2">
                {stats.monthly_spending
                  .filter(month => month.amount > 0)
                  .slice(-6)
                  .map((month) => (
                    <div key={month.month} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{month.month}</span>
                      <span className="font-medium text-sm">
                        R$ {month.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* System Info */}
          <div className="card bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Informações do Sistema
            </h3>
            <div className="space-y-1 text-xs text-gray-600">
              <div>Cadastrado: {new Date(guest.created_at).toLocaleString('pt-BR')}</div>
              <div>ID: {guest.id}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}