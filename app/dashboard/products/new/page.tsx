'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { ArrowLeft, Package, Save, DollarSign, Hash } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

interface ProductCategory {
  id: string
  name: string
  active: boolean
}

interface ProductFormData {
  name: string
  description: string
  category_id: string
  price: number
  unit: string
  stock_quantity: number
  min_stock_level: number
  barcode: string
  active: boolean
}

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const supabase = createClient()

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category_id: '',
    price: 0,
    unit: 'unidade',
    stock_quantity: 0,
    min_stock_level: 5,
    barcode: '',
    active: true
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, active')
        .eq('active', true)
        .order('display_order')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      toast.error('Erro ao carregar categorias')
      console.error('Error:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Nome do produto é obrigatório')
      return
    }

    if (!formData.category_id) {
      toast.error('Categoria é obrigatória')
      return
    }

    if (formData.price <= 0) {
      toast.error('Preço deve ser maior que zero')
      return
    }

    if (formData.stock_quantity < 0) {
      toast.error('Quantidade em estoque não pode ser negativa')
      return
    }

    if (formData.min_stock_level < 0) {
      toast.error('Estoque mínimo não pode ser negativo')
      return
    }

    setLoading(true)

    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category_id: formData.category_id,
        price: formData.price,
        unit: formData.unit,
        stock_quantity: formData.stock_quantity,
        min_stock_level: formData.min_stock_level,
        barcode: formData.barcode.trim() || null,
        active: formData.active
      }

      const { error } = await supabase
        .from('products')
        .insert([productData])

      if (error) throw error

      toast.success('Produto criado com sucesso!')
      router.push('/dashboard/products')
    } catch (error: any) {
      if (error.code === '23505') {
        if (error.message.includes('barcode')) {
          toast.error('Já existe um produto com este código de barras')
        } else {
          toast.error('Já existe um produto com este nome')
        }
      } else {
        toast.error('Erro ao criar produto')
      }
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (value: string) => {
    // Remove tudo que não é número ou vírgula/ponto
    const numericValue = value.replace(/[^\d.,]/g, '')
    // Converte vírgula para ponto
    const normalizedValue = numericValue.replace(',', '.')
    // Converte para número
    const numberValue = parseFloat(normalizedValue) || 0
    return numberValue
  }

  if (loadingCategories) {
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
          href="/dashboard/products"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Produto</h1>
          <p className="text-gray-600">Adicione um novo produto à conveniência</p>
        </div>
      </div>

      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Informações Básicas
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ex: Água Mineral 500ml, Refrigerante Coca-Cola..."
                  required
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.name.length}/200 caracteres
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Descrição detalhada do produto..."
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/1000 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione uma categoria...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    Nenhuma categoria ativa encontrada. 
                    <Link href="/dashboard/products/categories/new" className="underline">
                      Criar categoria
                    </Link>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Barras
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Código de barras (opcional)"
                    maxLength={50}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preço e Unidade */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Preço e Unidade
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço Unitário *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    value={formData.price > 0 ? formData.price.toFixed(2).replace('.', ',') : ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: formatPrice(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0,00"
                    required
                  />
                </div>
                {formData.price > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Valor: {formatCurrency(formData.price)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidade de Medida *
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="unidade">Unidade</option>
                  <option value="litro">Litro</option>
                  <option value="ml">Mililitro</option>
                  <option value="kg">Quilograma</option>
                  <option value="g">Grama</option>
                  <option value="pacote">Pacote</option>
                  <option value="caixa">Caixa</option>
                  <option value="lata">Lata</option>
                  <option value="garrafa">Garrafa</option>
                </select>
              </div>
            </div>
          </div>

          {/* Estoque */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Controle de Estoque
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade Inicial em Estoque *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Quantidade disponível para venda
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estoque Mínimo *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_stock_level: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alerta quando estoque atingir este nível
                </p>
              </div>
            </div>

            {formData.stock_quantity > 0 && formData.stock_quantity <= formData.min_stock_level && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  ⚠️ Atenção: A quantidade inicial está no nível de estoque mínimo ou abaixo.
                </p>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                Produto ativo (disponível para venda)
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preview do Produto</h3>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {formData.name || 'Nome do produto'}
                  </h4>
                  {formData.description && (
                    <p className="text-sm text-gray-600 mt-1">{formData.description}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-lg font-bold text-primary-600">
                      {formatCurrency(formData.price)}
                    </span>
                    <span className="text-sm text-gray-500">por {formData.unit}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      formData.stock_quantity > formData.min_stock_level
                        ? 'bg-green-100 text-green-800'
                        : formData.stock_quantity > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {formData.stock_quantity} em estoque
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      formData.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {formData.active ? 'Ativo' : 'Inativo'}
                    </span>
                    {formData.barcode && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {formData.barcode}
                      </span>
                    )}
                  </div>
                </div>
                <Package className="h-12 w-12 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/dashboard/products"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.name.trim() || !formData.category_id || formData.price <= 0}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{loading ? 'Criando...' : 'Criar Produto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}