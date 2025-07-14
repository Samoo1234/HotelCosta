'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Plus, Search, Filter, Bed, Users, DollarSign, Settings } from 'lucide-react'
import { formatCurrency, getStatusColor, getStatusText } from '@/lib/utils'
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
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('room_number')

      if (error) throw error
      setRooms(data || [])
    } catch (error) {
      toast.error('Erro ao carregar quartos')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateRoomStatus = async (roomId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ status: newStatus })
        .eq('id', roomId)

      if (error) throw error
      
      setRooms(rooms.map(room => 
        room.id === roomId ? { ...room, status: newStatus as any } : room
      ))
      toast.success('Status do quarto atualizado')
    } catch (error) {
      toast.error('Erro ao atualizar status')
      console.error('Error:', error)
    }
  }

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.room_type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter
    const matchesType = typeFilter === 'all' || room.room_type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const roomTypes = [...new Set(rooms.map(room => room.room_type))]
  const statusOptions = [
    { value: 'all', label: 'Todos os Status' },
    { value: 'available', label: 'Disponível' },
    { value: 'occupied', label: 'Ocupado' },
    { value: 'maintenance', label: 'Manutenção' },
    { value: 'reserved', label: 'Reservado' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-32 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quartos</h1>
          <p className="text-gray-600 mt-2">
            Gerencie todos os quartos do seu hotel
          </p>
        </div>
        <Link href="/dashboard/rooms/new" className="btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Novo Quarto
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">Todos os Tipos</option>
            {roomTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900">{rooms.length}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {rooms.filter(r => r.status === 'available').length}
          </div>
          <div className="text-sm text-gray-500">Disponíveis</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">
            {rooms.filter(r => r.status === 'occupied').length}
          </div>
          <div className="text-sm text-gray-500">Ocupados</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {rooms.filter(r => r.status === 'maintenance').length}
          </div>
          <div className="text-sm text-gray-500">Manutenção</div>
        </div>
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div className="card text-center py-12">
          <Bed className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum quarto encontrado
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece adicionando o primeiro quarto do seu hotel'
            }
          </p>
          <Link href="/dashboard/rooms/new" className="btn-primary">
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Quarto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRooms.map((room) => (
            <div key={room.id} className="card-hover">
              {/* Room Image Placeholder */}
              <div className="h-32 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg mb-4 flex items-center justify-center">
                <Bed className="h-12 w-12 text-primary-600" />
              </div>
              
              {/* Room Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Quarto {room.room_number}
                  </h3>
                  <span className={`status-badge ${getStatusColor(room.status)}`}>
                    {getStatusText(room.status)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Bed className="h-4 w-4 mr-2" />
                    {room.room_type}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {room.capacity} hóspedes
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 mr-2" />
                    {formatCurrency(room.price_per_night)}/noite
                  </div>
                </div>
                
                {/* Amenities */}
                {room.amenities && room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {room.amenities.slice(0, 3).map((amenity, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {amenity}
                      </span>
                    ))}
                    {room.amenities.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{room.amenities.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <select
                    value={room.status}
                    onChange={(e) => updateRoomStatus(room.id, e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="available">Disponível</option>
                    <option value="occupied">Ocupado</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="reserved">Reservado</option>
                  </select>
                  
                  <Link
                    href={`/dashboard/rooms/${room.id}`}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}