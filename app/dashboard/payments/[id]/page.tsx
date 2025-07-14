'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { ArrowLeft, CreditCard, Calendar, DollarSign, User, Bed, Trash2, CheckCircle, XCircle, AlertCircle, Clock, Edit } from 'lucide-react'
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
  guest: {
    id: string
    client_type: 'individual' | 'company'
    first_name: string | null
    last_name: string | null
    company_name: string | null
    trade_name: string | null
    email: string
    phone: string
    document_type: string
    document_number: string
  }
  room: {
    id: string
    room_number: string
    room_type: string
    price_per_night: number
  }
}

interface PaymentWithDetails extends Payment {
  reservation: Reservation
}

const PAYMENT_METHODS = {
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  pix: 'PIX',
  bank_transfer: 'Transferência Bancária',
  check: 'Cheque'
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  refunded: 'bg-gray-100 text-gray-800 border-gray-200'
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

export default function PaymentDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [payment, setPayment] = useState<PaymentWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const supabase = createClient()

  const [editData, setEditData] = useState({
    amount: 0,
    payment_method: '',
    payment_status: 'pending' as const,
    transaction_id: '',
    payment_date: ''
  })

  useEffect(() => {
    fetchPayment()
  }, [params.id])

  const fetchPayment = async () => {
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
        .eq('id', params.id)
        .single()

      if (error) throw error
      
      setPayment(data)
      setEditData({
        amount: data.amount,
        payment_method: data.payment_method,
        payment_status: data.payment_status,
        transaction_id: data.transaction_id || '',
        payment_date: data.payment_date.split('T')[0]
      })
    } catch (error) {
      toast.error('Erro ao carregar pagamento')
      console.error('Error:', error)
      router.push('/dashboard/payments')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          amount: editData.amount,
          payment_method: editData.payment_method,
          payment_status: editData.payment_status,
          transaction_id: editData.transaction_id || null,
          payment_date: new Date(editData.payment_date).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (error) throw error

      toast.success('Pagamento atualizado com sucesso!')
      setEditing(false)
      fetchPayment()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar pagamento')
      console.error('Error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', params.id)

      if (error) throw error

      toast.success('Pagamento excluído com sucesso!')
      router.push('/dashboard/payments')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir pagamento')
      console.error('Error:', error)
    }
  }

  const getGuestName = (guest: Reservation['guest']) => {
    return guest.client_type === 'individual'
      ? `${guest.first_name} ${guest.last_name}`
      : guest.trade_name || guest.company_name || 'Empresa'
  }

  const getStatusBadge = (status: string) => {
    const colorClass = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800 border-gray-200'
    const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status
    const IconComponent = STATUS_ICONS[status as keyof typeof STATUS_ICONS] || AlertCircle
    
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
        <IconComponent className="h-4 w-4 mr-2" />
        {label}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Pagamento não encontrado</h3>
        <Link href="/dashboard/payments" className="btn-primary mt-4">
          Voltar para Pagamentos
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/payments"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Detalhes do Pagamento</h1>
            <p className="text-gray-600 mt-2">
              Visualize e edite as informações do pagamento
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </button>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn-danger"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Pagamento */}
        <div className="lg:col-span-2">
          {editing ? (
            <form onSubmit={handleSubmit} className="card space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Edit className="h-5 w-5 mr-2" />
                  Editar Pagamento
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input pl-10"
                      value={editData.amount}
                      onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pagamento *
                  </label>
                  <select
                    className="input"
                    value={editData.payment_method}
                    onChange={(e) => setEditData({ ...editData, payment_method: e.target.value })}
                    required
                  >
                    {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    className="input"
                    value={editData.payment_status}
                    onChange={(e) => setEditData({ ...editData, payment_status: e.target.value as any })}
                    required
                  >
                    <option value="pending">Pendente</option>
                    <option value="completed">Concluído</option>
                    <option value="failed">Falhou</option>
                    <option value="refunded">Reembolsado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data do Pagamento *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="date"
                      className="input pl-10"
                      value={editData.payment_date}
                      onChange={(e) => setEditData({ ...editData, payment_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID da Transação
                </label>
                <input
                  type="text"
                  className="input"
                  value={editData.transaction_id}
                  onChange={(e) => setEditData({ ...editData, transaction_id: e.target.value })}
                  placeholder="ID ou código da transação"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          ) : (
            <div className="card space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Informações do Pagamento
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Valor</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <div className="mt-1">
                    {getStatusBadge(payment.payment_status)}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Método de Pagamento</p>
                  <p className="text-lg text-gray-900">
                    {PAYMENT_METHODS[payment.payment_method as keyof typeof PAYMENT_METHODS] || payment.payment_method}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Data do Pagamento</p>
                  <p className="text-lg text-gray-900">
                    {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {payment.transaction_id && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">ID da Transação</p>
                    <p className="text-lg text-gray-900 font-mono">{payment.transaction_id}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informações da Reserva */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Reserva Relacionada
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Hóspede</p>
                <p className="text-sm text-gray-900">{getGuestName(payment.reservation.guest)}</p>
                <p className="text-sm text-gray-500">{payment.reservation.guest.email}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Quarto</p>
                <p className="text-sm text-gray-900">
                  {payment.reservation.room.room_number} - {payment.reservation.room.room_type}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Check-in</p>
                <p className="text-sm text-gray-900">
                  {new Date(payment.reservation.check_in_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Check-out</p>
                <p className="text-sm text-gray-900">
                  {new Date(payment.reservation.check_out_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-500">Valor Total da Reserva</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(payment.reservation.total_amount)}
                </p>
              </div>
            </div>
          </div>

          {/* Metadados do Sistema */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Sistema</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Criado em</p>
                <p className="text-sm text-gray-900">
                  {new Date(payment.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Última atualização</p>
                <p className="text-sm text-gray-900">
                  {new Date(payment.updated_at).toLocaleString('pt-BR')}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">ID do Pagamento</p>
                <p className="text-sm text-gray-900 font-mono break-all">{payment.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Excluir Pagamento</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-danger"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}