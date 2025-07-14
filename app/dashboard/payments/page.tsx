'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Plus, Search, Filter, CreditCard, User, Calendar, DollarSign, Clock, Eye, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

interface Payment {
  id: string
  reservation_id: string
  amount: number
  payment_method: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  transaction_id: string | null
  payment_date: string
  created_at: string
  updated_at: string
}

interface Reservation {
  id: string
  guest_id: string
  room_id: string
  check_in_date: string
  check_out_date: string
  total_amount: number
  status: string
}

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
}

interface PaymentWithDetails extends Payment {
  reservation: Reservation & {
    guest: Guest
    room: Room
  }
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800'
}

const STATUS_LABELS = {
  pending: 'Pendente',
  completed: 'Concluído',
  failed: 'Falhou',
  refunded: 'Reembolsado'
}

const STATUS_ICONS = {
  pending: AlertCircle,
  completed: CheckCircle,
  failed: XCircle,
  refunded: Clock
}

const PAYMENT_METHODS = {
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  pix: 'PIX',
  bank_transfer: 'Transferência Bancária',
  check: 'Cheque'
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          reservation:reservations(
            *,
            guest:guests(*),
            room:rooms(*)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      toast.error('Erro ao carregar pagamentos')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deletePayment = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pagamento?')) return

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)

      if (error) throw error

      setPayments(payments.filter(p => p.id !== id))
      toast.success('Pagamento excluído com sucesso!')
    } catch (error) {
      toast.error('Erro ao excluir pagamento')
      console.error('Error:', error)
    }
  }

  const updatePaymentStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: newStatus })
        .eq('id', id)

      if (error) throw error

      setPayments(payments.map(p => 
        p.id === id ? { ...p, payment_status: newStatus as any } : p
      ))
      toast.success('Status do pagamento atualizado!')
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
    const colorClass = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'
    const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status
    const IconComponent = STATUS_ICONS[status as keyof typeof STATUS_ICONS] || AlertCircle
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {label}
      </span>
    )
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchTerm === '' || 
      getGuestName(payment.reservation.guest).toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reservation.room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reservation.guest.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter
    const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter

    let matchesDate = true
    if (dateFilter !== 'all') {
      const today = new Date()
      const paymentDate = new Date(payment.payment_date)
      
      switch (dateFilter) {
        case 'today':
          matchesDate = paymentDate.toDateString() === today.toDateString()
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesDate = paymentDate >= weekAgo && paymentDate <= today
          break
        case 'month':
          const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
          matchesDate = paymentDate >= monthAgo && paymentDate <= today
          break
      }
    }

    return matchesSearch && matchesStatus && matchesMethod && matchesDate
  })

  const stats = {
    total: payments.length,
    completed: payments.filter(p => p.payment_status === 'completed').length,
    pending: payments.filter(p => p.payment_status === 'pending').length,
    revenue: payments
      .filter(p => p.payment_status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0)
  }

  if (loading) {
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pagamentos</h1>
          <p className="text-gray-600 mt-2">
            Gerencie todos os pagamentos do hotel
          </p>
        </div>
        <Link href="/dashboard/payments/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Novo Pagamento
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Pagamentos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Concluídos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar pagamentos..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="completed">Concluído</option>
            <option value="failed">Falhou</option>
            <option value="refunded">Reembolsado</option>
          </select>
          
          <select
            className="input"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">Todos os Métodos</option>
            <option value="credit_card">Cartão de Crédito</option>
            <option value="debit_card">Cartão de Débito</option>
            <option value="cash">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="bank_transfer">Transferência</option>
            <option value="check">Cheque</option>
          </select>
          
          <select
            className="input"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">Todas as Datas</option>
            <option value="today">Hoje</option>
            <option value="week">Última Semana</option>
            <option value="month">Último Mês</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hóspede
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quarto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {getGuestName(payment.reservation.guest)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.reservation.guest.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.reservation.room.room_number}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.reservation.room.room_type}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {PAYMENT_METHODS[payment.payment_method as keyof typeof PAYMENT_METHODS] || payment.payment_method}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payment.payment_status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/dashboard/payments/${payment.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => deletePayment(payment.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum pagamento encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || methodFilter !== 'all' || dateFilter !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece criando um novo pagamento.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}