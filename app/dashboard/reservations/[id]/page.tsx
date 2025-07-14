'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Calendar, User, Bed, DollarSign, FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

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
  capacity: number
  price_per_night: number
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
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
  guest: Guest
  room: Room
}

interface ReservationFormData {
  guest_id: string
  room_id: string
  check_in_date: string
  check_out_date: string
  total_amount: number
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
  special_requests: string
}

export default function EditReservationPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [formData, setFormData] = useState<ReservationFormData>({
    guest_id: '',
    room_id: '',
    check_in_date: '',
    check_out_date: '',
    total_amount: 0,
    status: 'confirmed',
    special_requests: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchReservation()
      fetchInitialData()
    }
  }, [params.id])

  useEffect(() => {
    if (formData.check_in_date && formData.check_out_date && reservation) {
      checkRoomAvailability()
    }
  }, [formData.check_in_date, formData.check_out_date, reservation])

  useEffect(() => {
    calculateTotalAmount()
  }, [formData.room_id, formData.check_in_date, formData.check_out_date])

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
      setFormData({
        guest_id: data.guest_id,
        room_id: data.room_id,
        check_in_date: data.check_in_date,
        check_out_date: data.check_out_date,
        total_amount: data.total_amount,
        status: data.status,
        special_requests: data.special_requests || ''
      })
    } catch (error) {
      toast.error('Erro ao carregar reserva')
      console.error('Error:', error)
      router.push('/dashboard/reservations')
    }
  }

  const fetchInitialData = async () => {
    try {
      const [guestsRes, roomsRes] = await Promise.all([
        supabase.from('guests').select('*').order('created_at', { ascending: false }),
        supabase.from('rooms').select('*').order('room_number')
      ])

      if (guestsRes.data) setGuests(guestsRes.data)
      if (roomsRes.data) setRooms(roomsRes.data)
    } catch (error) {
      toast.error('Erro ao carregar dados')
      console.error('Error:', error)
    }
  }

  const checkRoomAvailability = async () => {
    if (!formData.check_in_date || !formData.check_out_date || !reservation) return

    try {
      // Buscar reservas que conflitam com as datas selecionadas (excluindo a reserva atual)
      const { data: conflictingReservations, error } = await supabase
        .from('reservations')
        .select('room_id')
        .neq('status', 'cancelled')
        .neq('id', reservation.id) // Excluir a reserva atual
        .or(`and(check_in_date.lte.${formData.check_out_date},check_out_date.gte.${formData.check_in_date})`)

      if (error) throw error

      const occupiedRoomIds = conflictingReservations?.map(r => r.room_id) || []
      const available = rooms.filter(room => 
        (room.status === 'available' || room.id === reservation.room_id) && 
        !occupiedRoomIds.includes(room.id)
      )
      
      setAvailableRooms(available)
      
      // Se o quarto selecionado não está mais disponível, limpar a seleção
      if (formData.room_id && !available.find(r => r.id === formData.room_id)) {
        setFormData(prev => ({ ...prev, room_id: '', total_amount: 0 }))
      }
    } catch (error) {
      toast.error('Erro ao verificar disponibilidade')
      console.error('Error:', error)
    }
  }

  const calculateTotalAmount = () => {
    if (!formData.room_id || !formData.check_in_date || !formData.check_out_date) {
      return
    }

    const room = rooms.find(r => r.id === formData.room_id)
    if (!room) return

    const checkIn = new Date(formData.check_in_date)
    const checkOut = new Date(formData.check_out_date)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    
    if (nights > 0) {
      const total = nights * room.price_per_night
      setFormData(prev => ({ ...prev, total_amount: total }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.guest_id) newErrors.guest_id = 'Selecione um hóspede'
    if (!formData.room_id) newErrors.room_id = 'Selecione um quarto'
    if (!formData.check_in_date) newErrors.check_in_date = 'Data de check-in é obrigatória'
    if (!formData.check_out_date) newErrors.check_out_date = 'Data de check-out é obrigatória'
    
    if (formData.check_in_date && formData.check_out_date) {
      const checkIn = new Date(formData.check_in_date)
      const checkOut = new Date(formData.check_out_date)
      
      if (checkOut <= checkIn) {
        newErrors.check_out_date = 'Data de check-out deve ser posterior ao check-in'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !reservation) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          guest_id: formData.guest_id,
          room_id: formData.room_id,
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
          total_amount: formData.total_amount,
          status: formData.status,
          special_requests: formData.special_requests || null
        })
        .eq('id', reservation.id)

      if (error) throw error

      toast.success('Reserva atualizada com sucesso!')
      router.push('/dashboard/reservations')
    } catch (error) {
      toast.error('Erro ao atualizar reserva')
      console.error('Error:', error)
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

  const nights = formData.check_in_date && formData.check_out_date 
    ? Math.ceil((new Date(formData.check_out_date).getTime() - new Date(formData.check_in_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (!reservation) {
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
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/reservations"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Editar Reserva #{reservation.id.slice(-8)}
            </h1>
            <p className="text-gray-600 mt-2">
              {getGuestName(reservation.guest)} - Quarto {reservation.room.room_number}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Guest Selection */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Seleção do Hóspede
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hóspede *
                  </label>
                  <select
                    className={`input ${errors.guest_id ? 'border-red-500' : ''}`}
                    value={formData.guest_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, guest_id: e.target.value }))}
                    required
                  >
                    <option value="">Selecione um hóspede</option>
                    {guests.map(guest => (
                      <option key={guest.id} value={guest.id}>
                        {getGuestName(guest)} - {guest.email}
                      </option>
                    ))}
                  </select>
                  {errors.guest_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.guest_id}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Datas da Reserva
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Check-in *
                  </label>
                  <input
                    type="date"
                    className={`input ${errors.check_in_date ? 'border-red-500' : ''}`}
                    value={formData.check_in_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_in_date: e.target.value }))}
                    required
                  />
                  {errors.check_in_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.check_in_date}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Check-out *
                  </label>
                  <input
                    type="date"
                    className={`input ${errors.check_out_date ? 'border-red-500' : ''}`}
                    value={formData.check_out_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_out_date: e.target.value }))}
                    min={formData.check_in_date}
                    required
                  />
                  {errors.check_out_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.check_out_date}</p>
                  )}
                </div>
              </div>
              
              {nights > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>{nights}</strong> noite{nights !== 1 ? 's' : ''} selecionada{nights !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Room Selection */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Bed className="h-5 w-5 mr-2" />
                Seleção do Quarto
              </h2>
              
              <div className="space-y-4">
                {availableRooms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bed className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Nenhum quarto disponível para as datas selecionadas</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quarto Disponível *
                    </label>
                    <select
                      className={`input ${errors.room_id ? 'border-red-500' : ''}`}
                      value={formData.room_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, room_id: e.target.value }))}
                      required
                    >
                      <option value="">Selecione um quarto</option>
                      {availableRooms.map(room => (
                        <option key={room.id} value={room.id}>
                          Quarto {room.room_number} - {room.room_type} - R$ {room.price_per_night.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/noite
                        </option>
                      ))}
                    </select>
                    {errors.room_id && (
                      <p className="text-red-500 text-sm mt-1">{errors.room_id}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Informações Adicionais
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status da Reserva
                  </label>
                  <select
                    className="input"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  >
                    <option value="confirmed">Confirmada</option>
                    <option value="checked_in">Check-in</option>
                    <option value="checked_out">Check-out</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="no_show">Não Compareceu</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Solicitações Especiais
                  </label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Ex: Cama extra, vista para o mar, andar alto..."
                    value={formData.special_requests}
                    onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Resumo da Reserva
              </h3>
              
              <div className="space-y-4">
                {formData.guest_id && (
                  <div>
                    <p className="text-sm text-gray-600">Hóspede</p>
                    <p className="font-medium">
                      {getGuestName(guests.find(g => g.id === formData.guest_id)!)}
                    </p>
                  </div>
                )}
                
                {formData.room_id && (
                  <div>
                    <p className="text-sm text-gray-600">Quarto</p>
                    <p className="font-medium">
                      {(() => {
                        const room = rooms.find(r => r.id === formData.room_id)
                        return room ? `${room.room_number} - ${room.room_type}` : ''
                      })()} 
                    </p>
                  </div>
                )}
                
                {formData.check_in_date && formData.check_out_date && (
                  <div>
                    <p className="text-sm text-gray-600">Período</p>
                    <p className="font-medium">
                      {new Date(formData.check_in_date).toLocaleDateString('pt-BR')} - {new Date(formData.check_out_date).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {nights} noite{nights !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
                
                {formData.room_id && nights > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Valor por noite</p>
                    <p className="font-medium">
                      R$ {(rooms.find(r => r.id === formData.room_id)?.price_per_night || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                
                {formData.total_amount > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-primary-600">
                      R$ {formData.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 border-t pt-4">
                  <p>Criada em: {new Date(reservation.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || !formData.guest_id || !formData.room_id || !formData.check_in_date || !formData.check_out_date}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      </form>

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