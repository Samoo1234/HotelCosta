'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { ArrowLeft, ShoppingCart, User, Building2, AlertCircle } from 'lucide-react'
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

interface Product {
  id: string
  name: string
  price: number
  unit: string
  stock_quantity: number
  active: boolean
  category?: {
    id: string
    name: string
  }
}

interface ProductCategory {
  id: string
  name: string
  active: boolean
}

interface ConsumptionFormData {
  reservation_id: string
  product_id: string
  quantity: number
  payment_responsibility: 'guest' | 'company'
  notes: string
}

export default function NewConsumptionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const supabase = createClient()

  const [formData, setFormData] = useState<ConsumptionFormData>({
    reservation_id: '',
    product_id: '',
    quantity: 1,
    payment_responsibility: 'guest',
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Buscar reservas ativas (checked_in)
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          *,
          guest:guests(*),
          room:rooms(*)
        `)
        .eq('status', 'checked_in')
        .order('room_id')

      if (reservationsError) throw reservationsError
      setReservations(reservationsData || [])

      // Buscar categorias
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('product_categories')
        .select('*')
        .eq('active', true)
        .order('display_order')

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      // Buscar produtos ativos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(*)
        `)
        .eq('active', true)
        .gt('stock_quantity', 0)
        .order('name')

      if (productsError) throw productsError
      setProducts(productsData || [])
    } catch (error) {
      toast.error('Erro ao carregar dados')
      console.error('Error:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleReservationChange = (reservationId: string) => {
    const reservation = reservations.find(r => r.id === reservationId)
    setSelectedReservation(reservation || null)
    setFormData(prev => ({ 
      ...prev, 
      reservation_id: reservationId,
      // Se for empresa, padrão é empresa pagar, senão hóspede
      payment_responsibility: reservation?.guest.client_type === 'company' ? 'company' : 'guest'
    }))
  }

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product || null)
    setFormData(prev => ({ ...prev, product_id: productId }))
  }

  const getGuestName = (guest: Guest) => {
    return guest.client_type === 'individual'
      ? `${guest.first_name} ${guest.last_name}`
      : guest.trade_name || guest.company_name || 'Empresa'
  }

  const getTotalAmount = () => {
    if (!selectedProduct) return 0
    return selectedProduct.price * formData.quantity
  }

  const filteredProducts = products.filter(product => {
    if (categoryFilter === 'all') return true
    return product.category?.id === categoryFilter
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.reservation_id || !formData.product_id || formData.quantity <= 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (!selectedProduct || formData.quantity > selectedProduct.stock_quantity) {
      toast.error('Quantidade não disponível em estoque')
      return
    }

    setLoading(true)

    try {
      const consumptionData = {
        reservation_id: formData.reservation_id,
        room_id: selectedReservation!.room_id,
        product_id: formData.product_id,
        quantity: formData.quantity,
        unit_price: selectedProduct.price,
        total_amount: getTotalAmount(),
        payment_responsibility: formData.payment_responsibility,
        notes: formData.notes || null,
        registered_by: 'Recepção', // Pode ser dinâmico baseado no usuário logado
        status: 'pending'
      }

      const { error } = await supabase
        .from('room_consumptions')
        .insert([consumptionData])

      if (error) throw error

      toast.success('Consumo registrado com sucesso!')
      router.push('/dashboard/consumptions')
    } catch (error) {
      toast.error('Erro ao registrar consumo')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/consumptions"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registrar Consumo</h1>
          <p className="text-gray-600">Registre o consumo de produtos da conveniência</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleção de Reserva/Quarto */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quarto e Hóspede</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione o Quarto/Hóspede *
                </label>
                <select
                  value={formData.reservation_id}
                  onChange={(e) => handleReservationChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione um quarto...</option>
                  {reservations.map(reservation => (
                    <option key={reservation.id} value={reservation.id}>
                      Quarto {reservation.room.room_number} - {getGuestName(reservation.guest)}
                      {reservation.guest.client_type === 'company' && ' (Empresa)'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedReservation && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Quarto:</span>
                      <p className="text-gray-900">{selectedReservation.room.room_number} ({selectedReservation.room.room_type})</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Hóspede:</span>
                      <p className="text-gray-900">{getGuestName(selectedReservation.guest)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tipo:</span>
                      <p className="text-gray-900">
                        {selectedReservation.guest.client_type === 'company' ? 'Empresa' : 'Pessoa Física'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Check-in:</span>
                      <p className="text-gray-900">
                        {new Date(selectedReservation.check_in_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seleção de Produto */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Produto</h3>
            
            <div className="space-y-4">
              {/* Filtro por Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">Todas as categorias</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção de Produto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produto *
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione um produto...</option>
                  {filteredProducts.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price)} ({product.stock_quantity} disponível)
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Preço unitário:</span>
                      <p className="text-gray-900">{formatCurrency(selectedProduct.price)} por {selectedProduct.unit}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Estoque disponível:</span>
                      <p className="text-gray-900">{selectedProduct.stock_quantity} {selectedProduct.unit}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Categoria:</span>
                      <p className="text-gray-900">{selectedProduct.category?.name || 'Sem categoria'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quantidade e Responsabilidade de Pagamento */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Detalhes do Consumo</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduct?.stock_quantity || 1}
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                {selectedProduct && formData.quantity > selectedProduct.stock_quantity && (
                  <p className="text-red-600 text-sm mt-1">
                    Quantidade não disponível em estoque
                  </p>
                )}
              </div>

              {/* CAMPO ESPECÍFICO PARA ESCOLHER QUEM PAGA */}
              {selectedReservation?.guest.client_type === 'company' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quem vai pagar este consumo? *
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="payment-guest"
                        name="payment_responsibility"
                        value="guest"
                        checked={formData.payment_responsibility === 'guest'}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_responsibility: e.target.value as 'guest' | 'company' }))}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="payment-guest" className="ml-3 flex items-center">
                        <User className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">
                          Hóspede ({getGuestName(selectedReservation.guest)})
                        </span>
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="payment-company"
                        name="payment_responsibility"
                        value="company"
                        checked={formData.payment_responsibility === 'company'}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_responsibility: e.target.value as 'guest' | 'company' }))}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="payment-company" className="ml-3 flex items-center">
                        <Building2 className="h-4 w-4 text-purple-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">
                          Empresa ({selectedReservation.guest.trade_name || selectedReservation.guest.company_name})
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 mr-2" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">Importante:</p>
                        <p>
                          {formData.payment_responsibility === 'guest' 
                            ? 'Este consumo será cobrado diretamente do hóspede, não da empresa.' 
                            : 'Este consumo será incluído na conta da empresa.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Observações sobre o consumo (opcional)..."
                />
              </div>
            </div>
          </div>

          {/* Resumo */}
          {selectedProduct && formData.quantity > 0 && (
            <div className="bg-primary-50 p-6 rounded-lg border border-primary-200">
              <h3 className="text-lg font-medium text-primary-900 mb-4">Resumo do Consumo</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-primary-700">Produto:</span>
                  <span className="font-medium text-primary-900">{selectedProduct.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-700">Quantidade:</span>
                  <span className="font-medium text-primary-900">{formData.quantity} {selectedProduct.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-700">Preço unitário:</span>
                  <span className="font-medium text-primary-900">{formatCurrency(selectedProduct.price)}</span>
                </div>
                <div className="border-t border-primary-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-primary-700 font-medium">Total:</span>
                    <span className="font-bold text-primary-900 text-lg">{formatCurrency(getTotalAmount())}</span>
                  </div>
                </div>
                {selectedReservation && (
                  <div className="flex justify-between">
                    <span className="text-primary-700">Será cobrado de:</span>
                    <span className="font-medium text-primary-900">
                      {formData.payment_responsibility === 'company' ? 'Empresa' : 'Hóspede'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/dashboard/consumptions"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.reservation_id || !formData.product_id || formData.quantity <= 0}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              <span>{loading ? 'Registrando...' : 'Registrar Consumo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}