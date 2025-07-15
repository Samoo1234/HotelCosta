'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { getLocalISOString, formatCurrency, getStatusColor, getStatusText } from '@/lib/utils'
import { ArrowLeft, Save, X, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

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

interface RoomFormData {
  room_number: string
  room_type: string
  capacity: number
  price_per_night: number
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
  amenities: string[]
  description: string
}

const ROOM_TYPES = [
  'Standard',
  'Deluxe',
  'Suite',
  'Presidential Suite',
  'Family Room',
  'Executive Room'
]

const COMMON_AMENITIES = [
  'Wi-Fi Gratuito',
  'TV a Cabo',
  'Ar Condicionado',
  'Frigobar',
  'Cofre',
  'Banheira',
  'Varanda',
  'Vista para o Mar',
  'Vista para a Cidade',
  'Serviço de Quarto 24h',
  'Mesa de Trabalho',
  'Secador de Cabelo'
]

export default function EditRoomPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState<RoomFormData>({
    room_number: '',
    room_type: 'Standard',
    capacity: 2,
    price_per_night: 0,
    status: 'available',
    amenities: [],
    description: ''
  })

  useEffect(() => {
    if (params.id) {
      fetchRoom(params.id as string)
    }
  }, [params.id])

  const fetchRoom = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (error) throw error
      
      setRoom(data)
      setFormData({
        room_number: data.room_number,
        room_type: data.room_type,
        capacity: data.capacity,
        price_per_night: data.price_per_night,
        status: data.status,
        amenities: data.amenities || [],
        description: data.description || ''
      })
    } catch (error) {
      toast.error('Erro ao carregar quarto')
      console.error('Error:', error)
      router.push('/dashboard/rooms')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }))
  }

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Verificar se o número do quarto já existe (exceto o atual)
      if (formData.room_number !== room?.room_number) {
        const { data: existingRoom } = await supabase
          .from('rooms')
          .select('id')
          .eq('room_number', formData.room_number)
          .neq('id', params.id)
          .single()

        if (existingRoom) {
          toast.error('Já existe um quarto com este número')
          return
        }
      }

      const { error } = await supabase
        .from('rooms')
        .update({
          room_number: formData.room_number,
          room_type: formData.room_type,
          capacity: formData.capacity,
          price_per_night: formData.price_per_night,
          status: formData.status,
          amenities: formData.amenities,
          description: formData.description || null,
          updated_at: getLocalISOString()
        })
        .eq('id', params.id)

      if (error) throw error

      toast.success('Quarto atualizado com sucesso!')
      router.push('/dashboard/rooms')
    } catch (error) {
      toast.error('Erro ao atualizar quarto')
      console.error('Error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este quarto? Esta ação não pode ser desfeita.')) {
      return
    }

    setDeleting(true)

    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', params.id)

      if (error) throw error

      toast.success('Quarto excluído com sucesso!')
      router.push('/dashboard/rooms')
    } catch (error) {
      toast.error('Erro ao excluir quarto')
      console.error('Error:', error)
    } finally {
      setDeleting(false)
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
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
              Quarto {room.room_number}
            </h1>
            <p className="text-gray-600 mt-2">
              Edite as informações do quarto
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`status-badge ${getStatusColor(room.status)}`}>
            {getStatusText(room.status)}
          </span>
        </div>
      </div>

      {/* Room Info Card */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{room.room_type}</div>
            <div className="text-sm text-gray-500">Tipo</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{room.capacity}</div>
            <div className="text-sm text-gray-500">Capacidade</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(room.price_per_night)}</div>
            <div className="text-sm text-gray-500">Por Noite</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{room.amenities?.length || 0}</div>
            <div className="text-sm text-gray-500">Comodidades</div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Informações Básicas
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número do Quarto *
                  </label>
                  <input
                    type="text"
                    name="room_number"
                    value={formData.room_number}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Ex: 101, A-205"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo do Quarto *
                  </label>
                  <select
                    name="room_type"
                    value={formData.room_type}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
                    {ROOM_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacidade *
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    className="input-field"
                    min="1"
                    max="10"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço por Noite (R$) *
                  </label>
                  <input
                    type="number"
                    name="price_per_night"
                    value={formData.price_per_night}
                    onChange={handleInputChange}
                    className="input-field"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="available">Disponível</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="occupied">Ocupado</option>
                    <option value="reserved">Reservado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Descrição
              </h2>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="input-field"
                rows={4}
                placeholder="Descreva as características especiais do quarto..."
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Amenities */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Comodidades
              </h2>
              
              <div className="space-y-2">
                {COMMON_AMENITIES.map(amenity => (
                  <label key={amenity} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity)}
                      onChange={() => handleAmenityToggle(amenity)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="card">
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full"
                >
                  {saving ? (
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
                
                <Link
                  href="/dashboard/rooms"
                  className="btn-secondary w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Link>
                
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-danger w-full"
                >
                  {deleting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Excluindo...
                    </div>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Quarto
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Room Details */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Detalhes</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>Criado em: {new Date(room.created_at).toLocaleDateString('pt-BR')}</div>
                <div>Atualizado em: {new Date(room.updated_at).toLocaleDateString('pt-BR')}</div>
                <div>ID: {room.id}</div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}