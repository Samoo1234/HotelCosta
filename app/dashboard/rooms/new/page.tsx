'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { getLocalISOString } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, X, Bed, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

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

export default function NewRoomPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<RoomFormData>({
    room_number: '',
    room_type: 'Standard',
    capacity: 2,
    price_per_night: 0,
    status: 'available',
    amenities: [],
    description: ''
  })

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
    setLoading(true)

    try {
      // Verificar se o número do quarto já existe
      const { data: existingRoom } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_number', formData.room_number)
        .single()

      if (existingRoom) {
        toast.error('Já existe um quarto com este número')
        return
      }

      const { error } = await supabase
        .from('rooms')
        .insert([{
          room_number: formData.room_number,
          room_type: formData.room_type,
          capacity: formData.capacity,
          price_per_night: formData.price_per_night,
          status: formData.status,
          amenities: formData.amenities,
          description: formData.description || null,
          created_at: getLocalISOString()
        }])

      if (error) throw error

      toast.success('Quarto criado com sucesso!')
      router.push('/dashboard/rooms')
    } catch (error) {
      toast.error('Erro ao criar quarto')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/rooms"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Quarto</h1>
          <p className="text-gray-600 mt-2">
            Adicione um novo quarto ao seu hotel
          </p>
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
                    Status Inicial
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

          {/* Amenities */}
          <div className="space-y-6">
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
                  disabled={loading}
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
                      Criar Quarto
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
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}