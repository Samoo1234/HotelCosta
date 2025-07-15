'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Plus, Search, Filter, ShoppingCart, User, Building2, Calendar, DollarSign, Eye, Trash2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

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

interface Product {
  id: string
  name: string
  price: number
  unit: string
  stock_quantity: number
  category?: {
    name: string
  }
}

interface Reservation {
  id: string
  guest_id: string
  room_id: string
  check_in_date: string
  check_out_date: string
  status: string
  guest: Guest
  room: Room
}

interface RoomConsumption {
  id: string
  reservation_id: string
  room_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_amount: number
  consumption_date: string
  payment_responsibility: 'guest' | 'company'
  status: 'pending' | 'billed' | 'paid' | 'cancelled'
  notes: string | null
  registered_by: string | null
  reservation: Reservation
  product: Product
}

export default function ConsumptionsPage() {
  const [consumptions, setConsumptions] = useState<RoomConsumption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchConsumptions()
  }, [])

  const fetchConsumptions = async () => {
    try {
      const { data, error } = await supabase
        .from('room_consumptions')
        .select(`
          *,
          reservation:reservations(
            *,
            guest:guests(*),
            room:rooms(*)
          ),
          product:products(
            *,
            category:product_categories(*)
          )
        `)
        .order('consumption_date', { ascending: false })

      if (error) throw error
      setConsumptions(data || [])
    } catch (error) {
      toast.error('Erro ao carregar consumos')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteConsumption = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este consumo?')) return

    try {
      const { error } = await supabase
        .from('room_consumptions')
        .delete()
        .eq('id', id)

      if (error) throw error

      setConsumptions(consumptions.filter(c => c.id !== id))
      toast.success('Consumo excluído com sucesso!')
    } catch (error) {
      toast.error('Erro ao excluir consumo')
      console.error('Error:', error)
    }
  }

  const updateConsumptionStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('room_consumptions')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      setConsumptions(consumptions.map(c => 
        c.id === id ? { ...c, status: newStatus as any } : c
      ))
      toast.success('Status atualizado com sucesso!')
    } catch (error) {
      toast.error('Erro ao atualizar status')
      console.error('Error:', error)
    }
  }

  const getGuestName = (guest: Guest) => {
    return guest.client_type === 'individual'
      ? `${guest.first_name} ${guest.last_name}`
      : guest.trade_name || guest.company_name || 'Empresa'
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      billed: { label: 'Faturado', color: 'bg-blue-100 text-blue-800' },
      paid: { label: 'Pago', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getPaymentResponsibilityBadge = (responsibility: string, clientType: string) => {
    if (clientType === 'individual') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <User className="h-3 w-3 mr-1" />
          Hóspede
        </span>
      )
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        responsibility === 'company' 
          ? 'bg-purple-100 text-purple-800' 
          : 'bg-blue-100 text-blue-800'
      }`}>
        {responsibility === 'company' ? (
          <><Building2 className="h-3 w-3 mr-1" />Empresa</>
        ) : (
          <><User className="h-3 w-3 mr-1" />Hóspede</>
        )}
      </span>
    )
  }

  const filteredConsumptions = consumptions.filter(consumption => {
    const guestName = getGuestName(consumption.reservation.guest)
    const matchesSearch = searchTerm === '' || 
      guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consumption.reservation.room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consumption.product.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || consumption.status === statusFilter
    const matchesPayment = paymentFilter === 'all' || consumption.payment_responsibility === paymentFilter

    let matchesDate = true
    if (dateFilter !== 'all') {
      const today = new Date()
      const consumptionDate = new Date(consumption.consumption_date)
      
      switch (dateFilter) {
        case 'today':
          matchesDate = consumptionDate.toDateString() === today.toDateString()
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesDate = consumptionDate >= weekAgo
          break
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesDate = consumptionDate >= monthAgo
          break
      }
    }

    return matchesSearch && matchesStatus && matchesPayment && matchesDate
  })

  const totalAmount = filteredConsumptions.reduce((sum, c) => sum + c.total_amount, 0)
  const pendingAmount = filteredConsumptions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.total_amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consumos da Conveniência</h1>
          <p className="text-gray-600">Gerencie os consumos de produtos pelos hóspedes</p>
        </div>
        <Link
          href="/dashboard/consumptions/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Registrar Consumo</span>
        </Link>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Consumos</p>
              <p className="text-2xl font-bold text-gray-900">{filteredConsumptions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendente</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Hóspede, quarto, produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="billed">Faturado</option>
              <option value="paid">Pago</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quem Paga
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="guest">Hóspede</option>
              <option value="company">Empresa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="today">Hoje</option>
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setPaymentFilter('all')
                setDateFilter('all')
              }}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Limpar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Consumos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quarto/Hóspede
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quem Paga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConsumptions.map((consumption) => (
                <tr key={consumption.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(consumption.consumption_date).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(consumption.consumption_date).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      Quarto {consumption.reservation.room.room_number}
                    </div>
                    <div className="text-sm text-gray-500">
                      {getGuestName(consumption.reservation.guest)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {consumption.product.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {consumption.product.category?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {consumption.quantity} {consumption.product.unit}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(consumption.unit_price)} cada
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(consumption.total_amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPaymentResponsibilityBadge(
                      consumption.payment_responsibility,
                      consumption.reservation.guest.client_type
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(consumption.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        href={`/dashboard/consumptions/${consumption.id}/details`}
                        className="text-primary-600 hover:text-primary-900 p-1 rounded"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {consumption.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateConsumptionStatus(consumption.id, 'billed')}
                            className="text-blue-600 hover:text-blue-900 text-xs px-2 py-1 rounded"
                            title="Marcar como faturado"
                          >
                            Faturar
                          </button>
                          <button
                            onClick={() => deleteConsumption(consumption.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredConsumptions.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum consumo encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || paymentFilter !== 'all' || dateFilter !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Nenhum consumo foi registrado ainda.'}
            </p>
            {!searchTerm && statusFilter === 'all' && paymentFilter === 'all' && dateFilter === 'all' && (
              <div className="mt-6">
                <Link
                  href="/dashboard/consumptions/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" />
                  Registrar Primeiro Consumo
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}