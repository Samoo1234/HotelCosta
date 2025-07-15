'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Calendar, User, Bed, DollarSign, FileText } from 'lucide-react'
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

interface ReservationFormData {
  guest_id: string
  room_id: string
  check_in_date: string
  check_out_date: string
  total_amount: number
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
  special_requests: string
}

export default function NewReservationPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [guests, setGuests] = useState<Guest[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [hotelSettings, setHotelSettings] = useState<{check_in_time: string, check_out_time: string} | null>(null)
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

  useEffect(() => {
    fetchInitialData()
    loadHotelSettings()
  }, [])

  useEffect(() => {
    if (formData.check_in_date) {
      checkRoomAvailability()
    }
  }, [formData.check_in_date, formData.check_out_date])

  useEffect(() => {
    calculateTotalAmount()
  }, [formData.room_id, formData.check_in_date, formData.check_out_date])

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

  const loadHotelSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('check_in_time, check_out_time')
        .limit(1)
        .single()

      if (error) throw error
      setHotelSettings(data)
    } catch (error) {
      console.error('Error loading hotel settings:', error)
      // Usar valores padrão se não conseguir carregar
      setHotelSettings({ check_in_time: '14:00', check_out_time: '12:00' })
    }
  }

  const checkRoomAvailability = async () => {
    if (!formData.check_in_date) return

    try {
      let conflictQuery = supabase
        .from('reservations')
        .select('room_id, check_in_date, check_out_date')
        .neq('status', 'cancelled')
        .neq('status', 'checked_out')
      
      // Se tem data de check-out, verificar conflitos normais
      if (formData.check_out_date) {
        conflictQuery = conflictQuery
          .or(`and(check_in_date.lte.${formData.check_out_date},check_out_date.gte.${formData.check_in_date})`)
      } else {
        // Se não tem check-out (estadia prolongada), verificar se há conflitos no check-in
        // Buscar reservas que:
        // 1. Começam no mesmo dia ou depois
        // 2. Ou que ainda estão em aberto (check_out_date null)
        // 3. Ou que terminam depois do nosso check-in
        conflictQuery = conflictQuery
          .or(`check_in_date.eq.${formData.check_in_date},and(check_in_date.lte.${formData.check_in_date},or(check_out_date.is.null,check_out_date.gt.${formData.check_in_date}))`)
      }

      const { data: conflictingReservations, error } = await conflictQuery

      if (error) throw error

      const occupiedRoomIds = conflictingReservations?.map(r => r.room_id) || []
      const available = rooms.filter(room => 
        room.status === 'available' && !occupiedRoomIds.includes(room.id)
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
    if (!formData.room_id || !formData.check_in_date || !hotelSettings) {
      setFormData(prev => ({ ...prev, total_amount: 0 }))
      return
    }

    const room = rooms.find(r => r.id === formData.room_id)
    if (!room) return

    // Se não tem check-out, calcular apenas 1 diária (estadia em aberto)
    if (!formData.check_out_date) {
      setFormData(prev => ({ ...prev, total_amount: room.price_per_night }))
      return
    }

    // Criar datas com horários configurados pelo administrador
    const checkInDateTime = new Date(`${formData.check_in_date}T${hotelSettings.check_in_time}:00`)
    const checkOutDateTime = new Date(`${formData.check_out_date}T${hotelSettings.check_out_time}:00`)
    
    // Calcular diferença em milissegundos
    const diffMs = checkOutDateTime.getTime() - checkInDateTime.getTime()
    
    // Converter para dias (considerando que uma diária = 24 horas)
    const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    // Garantir pelo menos 1 diária
    const finalNights = Math.max(1, nights)
    
    const total = finalNights * room.price_per_night
    setFormData(prev => ({ ...prev, total_amount: total }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.guest_id) newErrors.guest_id = 'Selecione um hóspede'
    if (!formData.room_id) newErrors.room_id = 'Selecione um quarto'
    if (!formData.check_in_date) newErrors.check_in_date = 'Data de check-in é obrigatória'
    // Check-out é opcional para permitir estadias prolongadas
    
    if (formData.check_in_date && formData.check_out_date) {
      const checkIn = new Date(formData.check_in_date + 'T00:00:00')
      const checkOut = new Date(formData.check_out_date + 'T00:00:00')
      
      if (checkOut <= checkIn) {
        newErrors.check_out_date = 'Data de check-out deve ser posterior ao check-in'
      }
    }
    
    if (formData.check_in_date) {
      const checkIn = new Date(formData.check_in_date + 'T00:00:00')
      const today = new Date()
      
      // Permitir reservas para hoje independente do horário
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      
      // Se é uma data anterior a hoje, não permitir
      if (checkIn < todayStart) {
        newErrors.check_in_date = 'Data de check-in não pode ser no passado'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('reservations')
        .insert([{
          guest_id: formData.guest_id,
          room_id: formData.room_id,
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date || null,
          total_amount: formData.total_amount,
          status: formData.status,
          special_requests: formData.special_requests || null
        }])

      if (error) throw error

      toast.success('Reserva criada com sucesso!')
      router.push('/dashboard/reservations')
    } catch (error) {
      toast.error('Erro ao criar reserva')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGuestName = (guest: Guest) => {
    return guest.client_type === 'individual'
      ? `${guest.first_name} ${guest.last_name}`
      : guest.trade_name || guest.company_name || 'Empresa'
  }

  const getNights = () => {
    if (formData.check_in_date && formData.check_out_date && hotelSettings) {
      const checkInDateTime = new Date(`${formData.check_in_date}T${hotelSettings.check_in_time}:00`)
      const checkOutDateTime = new Date(`${formData.check_out_date}T${hotelSettings.check_out_time}:00`)
      const diffMs = checkOutDateTime.getTime() - checkInDateTime.getTime()
      return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    }
    return formData.check_in_date ? 1 : 0 // Se só tem check-in, mostrar 1 diária
  }

  const nights = getNights()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/reservations"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nova Reserva</h1>
          <p className="text-gray-600 mt-2">
            Crie uma nova reserva para o hotel
          </p>
        </div>
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
                
                <div className="text-sm text-gray-600">
                  Não encontrou o hóspede? 
                  <Link href="/dashboard/guests/new" className="text-primary-600 hover:text-primary-700 font-medium">
                    Cadastre um novo hóspede
                  </Link>
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
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                  {errors.check_in_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.check_in_date}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Check-out
                    <span className="text-xs text-gray-500 ml-1">(opcional para estadias prolongadas)</span>
                  </label>
                  <input
                    type="date"
                    className={`input ${errors.check_out_date ? 'border-red-500' : ''}`}
                    value={formData.check_out_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_out_date: e.target.value }))}
                    min={formData.check_in_date || new Date().toISOString().split('T')[0]}
                  />
                  {errors.check_out_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.check_out_date}</p>
                  )}
                  {!formData.check_out_date && formData.check_in_date && (
                    <p className="text-blue-600 text-xs mt-1">
                      💡 Deixe em branco para estadia em aberto (pode ser definida posteriormente)
                    </p>
                  )}
                </div>
              </div>
              
              {nights > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>{nights}</strong> noite{nights !== 1 ? 's' : ''} selecionada{nights !== 1 ? 's' : ''}
                    {formData.check_in_date && !formData.check_out_date && hotelSettings && (
                      <span className="block mt-1 text-xs">
                        ⏰ Diária conta de {hotelSettings.check_in_time} a {hotelSettings.check_out_time} do dia seguinte
                      </span>
                    )}
                  </p>
                </div>
              )}
              
              {formData.check_in_date && !formData.check_out_date && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    <strong>📅 Estadia em Aberto:</strong> Check-out pode ser definido posteriormente.
                    <br />
                    <span className="text-xs">Valor inicial: 1 diária. Será ajustado conforme a duração real da estadia.</span>
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
                {!formData.check_in_date ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Selecione a data de check-in para ver os quartos disponíveis</p>
                  </div>
                ) : availableRooms.length === 0 ? (
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
                
                {formData.check_in_date && (
                  <div>
                    <p className="text-sm text-gray-600">Período</p>
                    <p className="font-medium">
                      {new Date(formData.check_in_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      {formData.check_out_date ? ` - ${new Date(formData.check_out_date + 'T00:00:00').toLocaleDateString('pt-BR')}` : ' (em aberto)'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {nights} noite{nights !== 1 ? 's' : ''}
                      {!formData.check_out_date && ' (inicial)'}
                    </p>
                  </div>
                )}
                
                {formData.room_id && nights > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">
                      {formData.check_out_date ? 'Valor por noite' : 'Valor da diária (inicial)'}
                    </p>
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
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || !formData.guest_id || !formData.room_id || !formData.check_in_date}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Criando...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Criar Reserva
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}