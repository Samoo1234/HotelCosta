'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Users, DollarSign, Clock, Edit, Bed } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency, getStatusColor, getStatusText } from '@/lib/utils'

interface Room {
  id: string
  room_number: string
  room_type: string
  capacity: number
  price_per_night: number
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
  amenities: string[] | null
  description: string | null
  created_at: string
  updated_at: string
}

interface Reservation {
  id: string
  check_in_date: string
  check_out_date: string
  total_amount: number
  status: string
  guest: {
    first_name: string
    last_name: string
    email: string
  }
}

export default function RoomDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

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

  const calculateNights = (checkIn: string, checkOut: string) => {
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
  const [room, setRoom] = useState<Room | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [hotelSettings, setHotelSettings] = useState<{check_in_time: string, check_out_time: string} | null>(null)
  const [stats, setStats] = useState({
    totalReservations: 0,
    totalRevenue: 0,
    averageStay: 0,
    occupancyRate: 0
  })

  useEffect(() => {
    if (params.id) {
      fetchRoomData(params.id as string)
      loadHotelSettings()
    }
  }, [params.id])

  const fetchRoomData = async (roomId: string) => {
    try {
      // Fetch room details
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (roomError) throw roomError
      setRoom(roomData)

      // Fetch reservations with guest info
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          id,
          check_in_date,
          check_out_date,
          total_amount,
          status,
          guests!inner (
            first_name,
            last_name,
            email
          )
        `)
        .eq('room_id', roomId)
        .order('check_in_date', { ascending: false })
        .limit(10)

      if (reservationsError) throw reservationsError
      
      const formattedReservations = reservationsData?.map(res => ({
        ...res,
        guest: Array.isArray(res.guests) ? res.guests[0] : res.guests
      })) || []
      
      setReservations(formattedReservations)

      // Calculate stats
      if (reservationsData) {
        const totalReservations = reservationsData.length
        const totalRevenue = reservationsData.reduce((sum, res) => sum + res.total_amount, 0)
        const totalDays = reservationsData.reduce((sum, res) => {
          return sum + calculateNights(res.check_in_date, res.check_out_date)
        }, 0)
        const averageStay = totalReservations > 0 ? totalDays / totalReservations : 0
        
        // Calculate occupancy rate for last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const recentReservations = reservationsData.filter(res => 
          new Date(res.check_in_date) >= thirtyDaysAgo
        )
        const occupiedDays = recentReservations.reduce((sum, res) => {
          return sum + calculateNights(res.check_in_date, res.check_out_date)
        }, 0)
        const occupancyRate = (occupiedDays / 30) * 100

        setStats({
          totalReservations,
          totalRevenue,
          averageStay,
          occupancyRate
        })
      }
    } catch (error) {
      toast.error('Erro ao carregar dados do quarto')
      console.error('Error:', error)
      router.push('/dashboard/rooms')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Quarto não encontrado</h2>
        <p className="text-gray-600 mb-6">O quarto que você está procurando não existe.</p>
        <Link href="/dashboard/rooms" className="btn-primary">
          Voltar para Quartos
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
            href="/dashboard/rooms"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Quarto {room.room_number} - Detalhes
            </h1>
            <p className="text-gray-600 mt-2">
              Informações completas e histórico do quarto
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`status-badge ${getStatusColor(room.status)}`}>
            {getStatusText(room.status)}
          </span>
          <Link
            href={`/dashboard/rooms/${room.id}`}
            className="btn-primary"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </div>
      </div>

      {/* Room Overview */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Room Image Placeholder */}
          <div className="h-64 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
            <Bed className="h-24 w-24 text-primary-600" />
          </div>
          
          {/* Room Info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {room.room_type}
              </h2>
              <p className="text-gray-600">
                {room.description || 'Sem descrição disponível'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Capacidade</div>
                <div className="text-lg font-semibold text-gray-900">
                  {room.capacity} hóspedes
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Preço por Noite</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(room.price_per_night)}
                </div>
              </div>
            </div>
            
            {/* Amenities */}
            {room.amenities && room.amenities.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Comodidades</h3>
                <div className="flex flex-wrap gap-2">
                  {room.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card text-center">
          <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{stats.totalReservations}</div>
          <div className="text-sm text-gray-500">Total de Reservas</div>
        </div>
        
        <div className="card text-center">
          <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div className="text-sm text-gray-500">Receita Total</div>
        </div>
        
        <div className="card text-center">
          <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {stats.averageStay.toFixed(1)} dias
          </div>
          <div className="text-sm text-gray-500">Estadia Média</div>
        </div>
        
        <div className="card text-center">
          <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {stats.occupancyRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500">Taxa de Ocupação (30d)</div>
        </div>
      </div>

      {/* Recent Reservations */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Reservas Recentes
          </h2>
          <Link
            href={`/dashboard/reservations?room=${room.id}`}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Ver todas
          </Link>
        </div>
        
        {reservations.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma reserva encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Hóspede</th>
                  <th className="table-header">Check-in</th>
                  <th className="table-header">Check-out</th>
                  <th className="table-header">Valor</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div>
                        <div className="font-medium text-gray-900">
                          {reservation.guest.first_name} {reservation.guest.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {reservation.guest.email}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      {new Date(reservation.check_in_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="table-cell">
                      {new Date(reservation.check_out_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="table-cell font-medium">
                      {formatCurrency(reservation.total_amount)}
                    </td>
                    <td className="table-cell">
                      <span className={`status-badge ${
                        reservation.status === 'confirmed' ? 'status-reserved' :
                        reservation.status === 'checked_in' ? 'status-occupied' :
                        reservation.status === 'checked_out' ? 'status-available' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {reservation.status === 'confirmed' ? 'Confirmada' :
                         reservation.status === 'checked_in' ? 'Check-in' :
                         reservation.status === 'checked_out' ? 'Check-out' :
                         reservation.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Room Details */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Informações do Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">ID do Quarto:</span> {room.id}
          </div>
          <div>
            <span className="font-medium">Criado em:</span> {new Date(room.created_at).toLocaleString('pt-BR')}
          </div>
          <div>
            <span className="font-medium">Última atualização:</span> {new Date(room.updated_at).toLocaleString('pt-BR')}
          </div>
          <div>
            <span className="font-medium">Status atual:</span> {getStatusText(room.status)}
          </div>
        </div>
      </div>
    </div>
  )
}