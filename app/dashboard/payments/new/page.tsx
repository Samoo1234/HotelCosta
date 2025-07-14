'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { ArrowLeft, CreditCard, Calendar, DollarSign, User, Bed } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

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
  }
  room: {
    id: string
    room_number: string
    room_type: string
  }
}

interface PaymentData {
  reservation_id: string
  amount: number
  payment_method: string
  payment_status: 'pending' | 'completed' | 'failed'
  transaction_id: string
  payment_date: string
}

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'bank_transfer', label: 'Transferência Bancária' },
  { value: 'check', label: 'Cheque' }
]

export default function NewPaymentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loadingReservations, setLoadingReservations] = useState(true)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState<PaymentData>({
    reservation_id: '',
    amount: 0,
    payment_method: 'credit_card',
    payment_status: 'completed',
    transaction_id: '',
    payment_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchReservations()
  }, [])

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guest:guests(*),
          room:rooms(*)
        `)
        .in('status', ['confirmed', 'checked_in'])
        .order('check_in_date', { ascending: true })

      if (error) throw error
      setReservations(data || [])
    } catch (error) {
      toast.error('Erro ao carregar reservas')
      console.error('Error:', error)
    } finally {
      setLoadingReservations(false)
    }
  }

  const handleReservationChange = (reservationId: string) => {
    const reservation = reservations.find(r => r.id === reservationId)
    if (reservation) {
      setSelectedReservation(reservation)
      setFormData(prev => ({
        ...prev,
        reservation_id: reservationId,
        amount: reservation.total_amount
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validações
      if (!formData.reservation_id) {
        toast.error('Selecione uma reserva')
        return
      }

      if (formData.amount <= 0) {
        toast.error('O valor deve ser maior que zero')
        return
      }

      if (!formData.payment_method) {
        toast.error('Selecione um método de pagamento')
        return
      }

      // Criar pagamento
      const { error } = await supabase
        .from('payments')
        .insert({
          reservation_id: formData.reservation_id,
          amount: formData.amount,
          payment_method: formData.payment_method,
          payment_status: formData.payment_status,
          transaction_id: formData.transaction_id || null,
          payment_date: new Date(formData.payment_date).toISOString()
        })

      if (error) throw error

      toast.success('Pagamento criado com sucesso!')
      router.push('/dashboard/payments')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar pagamento')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGuestName = (guest: Reservation['guest']) => {
    return guest.client_type === 'individual'
      ? `${guest.first_name} ${guest.last_name}`
      : guest.trade_name || guest.company_name || 'Empresa'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/payments"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Pagamento</h1>
          <p className="text-gray-600 mt-2">
            Registre um novo pagamento para uma reserva
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Informações do Pagamento
              </h2>
            </div>

            {/* Seleção de Reserva */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reserva *
              </label>
              {loadingReservations ? (
                <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
              ) : (
                <select
                  className="input"
                  value={formData.reservation_id}
                  onChange={(e) => handleReservationChange(e.target.value)}
                  required
                >
                  <option value="">Selecione uma reserva</option>
                  {reservations.map((reservation) => (
                    <option key={reservation.id} value={reservation.id}>
                      {getGuestName(reservation.guest)} - Quarto {reservation.room.room_number} - {formatCurrency(reservation.total_amount)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Valor */}
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
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            {/* Método de Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pagamento *
              </label>
              <select
                className="input"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                required
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status do Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status do Pagamento *
              </label>
              <select
                className="input"
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as any })}
                required
              >
                <option value="completed">Concluído</option>
                <option value="pending">Pendente</option>
                <option value="failed">Falhou</option>
              </select>
            </div>

            {/* ID da Transação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID da Transação
              </label>
              <input
                type="text"
                className="input"
                value={formData.transaction_id}
                onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                placeholder="ID ou código da transação"
              />
            </div>

            {/* Data do Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data do Pagamento *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="date"
                  className="input pl-10"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <Link
                href="/dashboard/payments"
                className="btn-secondary"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Salvando...' : 'Criar Pagamento'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar com informações da reserva */}
        <div className="space-y-6">
          {selectedReservation && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Detalhes da Reserva
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Hóspede</p>
                  <p className="text-sm text-gray-900">{getGuestName(selectedReservation.guest)}</p>
                  <p className="text-sm text-gray-500">{selectedReservation.guest.email}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Quarto</p>
                  <p className="text-sm text-gray-900">
                    {selectedReservation.room.room_number} - {selectedReservation.room.room_type}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Check-in</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedReservation.check_in_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Check-out</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedReservation.check_out_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-500">Valor Total</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(selectedReservation.total_amount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dicas */}
          <div className="card bg-blue-50 border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Dicas</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Selecione uma reserva ativa para registrar o pagamento</li>
              <li>• O valor pode ser parcial ou total da reserva</li>
              <li>• Adicione o ID da transação para controle</li>
              <li>• Pagamentos concluídos afetam o relatório de receita</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}