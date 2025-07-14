'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { formatDate, getStatusColor, getStatusText } from '@/lib/utils'
import { Calendar, User, Bed } from 'lucide-react'
import Link from 'next/link'

interface Reservation {
  id: string
  check_in_date: string
  check_out_date: string
  status: string
  total_amount: number
  guest_id: string
  room_id: string
  created_at: string
}

interface Guest {
  id: string
  client_type: 'individual' | 'company'
  first_name: string | null
  last_name: string | null
  company_name: string | null
  trade_name: string | null
  email: string
}

interface Room {
  id: string
  room_number: string
  room_type: string
}

export default function RecentReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        const [reservationsRes, guestsRes, roomsRes] = await Promise.all([
          supabase
            .from('reservations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('guests').select('*'),
          supabase.from('rooms').select('*'),
        ])

        if (reservationsRes.data) setReservations(reservationsRes.data)
        if (guestsRes.data) setGuests(guestsRes.data)
        if (roomsRes.data) setRooms(roomsRes.data)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getGuestName = (guestId: string) => {
    const guest = guests.find(g => g.id === guestId)
    if (!guest) return 'Hóspede não encontrado'
    
    return guest.client_type === 'individual' 
      ? `${guest.first_name} ${guest.last_name}`
      : guest.trade_name || guest.company_name || 'Empresa'
  }

  const getRoomInfo = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    return room ? `${room.room_number} - ${room.room_type}` : 'Quarto não encontrado'
  }

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Reservas Recentes
        </h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Reservas Recentes
        </h3>
        <Link
          href="/dashboard/reservations"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Ver todas
        </Link>
      </div>

      {reservations.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Nenhuma reserva encontrada</p>
          <Link
            href="/dashboard/reservations/new"
            className="btn-primary mt-4 inline-flex"
          >
            Criar Nova Reserva
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getGuestName(reservation.guest_id)}
                  </p>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <Bed className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-500 truncate">
                    {getRoomInfo(reservation.room_id)}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(reservation.check_in_date)} - {formatDate(reservation.check_out_date)}
                </p>
              </div>
              
              <div className="flex flex-col items-end">
                <span className={`status-badge ${getStatusColor(reservation.status)}`}>
                  {getStatusText(reservation.status)}
                </span>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  R$ {reservation.total_amount.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}