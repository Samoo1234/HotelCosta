'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, User, Bed, DollarSign, FileText, Phone, Mail, MapPin, Edit, Trash2 } from 'lucide-react'
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

  useEffect(() => {
    if (params.id) {
      fetchReservation()
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

  const getGuestName = (guest: Guest) => {
    return guest.client_type === 'individual'
      ? `${guest.first_name} ${guest.last_name}`
      : guest.trade_name || guest.company_name || 'Empresa'
  }

  const getNights = (checkIn: string, checkOut: string) => {
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getDaysUntilCheckIn = (checkInDate: string) => {
    const today = new Date()
    const checkIn = new Date(checkInDate)
    const diffTime = checkIn.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
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