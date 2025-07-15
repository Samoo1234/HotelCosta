'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { getLocalISOString } from '@/lib/utils'
import { ArrowLeft, Save, X, User } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface GuestFormData {
  client_type: 'individual' | 'company'
  // Campos para pessoa física
  first_name: string
  last_name: string
  date_of_birth: string
  // Campos para empresa
  company_name: string
  trade_name: string
  contact_person: string
  // Campos comuns
  email: string
  phone: string
  document_type: string
  document_number: string
  address: string
  nationality: string
}

const DOCUMENT_TYPES_INDIVIDUAL = [
  'CPF',
  'RG',
  'CNH',
  'Passaporte',
  'RNE',
  'Certidão de Nascimento'
]

const DOCUMENT_TYPES_COMPANY = [
  'CNPJ',
  'Inscrição Estadual',
  'Inscrição Municipal'
]

const NATIONALITIES = [
  'Brasileira',
  'Argentina',
  'Uruguaia',
  'Paraguaia',
  'Chilena',
  'Boliviana',
  'Peruana',
  'Colombiana',
  'Venezuelana',
  'Equatoriana',
  'Americana',
  'Canadense',
  'Mexicana',
  'Francesa',
  'Alemã',
  'Italiana',
  'Espanhola',
  'Portuguesa',
  'Inglesa',
  'Japonesa',
  'Chinesa',
  'Coreana',
  'Indiana',
  'Australiana',
  'Outra'
]

export default function NewGuestPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<GuestFormData>({
    client_type: 'individual',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    company_name: '',
    trade_name: '',
    contact_person: '',
    email: '',
    phone: '',
    document_type: '',
    document_number: '',
    address: '',
    nationality: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = (): boolean => {
    // Campos comuns obrigatórios
    const commonFields = ['email', 'phone', 'document_type', 'document_number', 'address', 'nationality']
    
    for (const field of commonFields) {
      if (!formData[field as keyof GuestFormData]) {
        toast.error(`Campo ${field.replace('_', ' ')} é obrigatório`)
        return false
      }
    }
    
    // Validação específica por tipo de cliente
    if (formData.client_type === 'individual') {
      const individualFields = ['first_name', 'last_name', 'date_of_birth']
      for (const field of individualFields) {
        if (!formData[field as keyof GuestFormData]) {
          toast.error(`Campo ${field.replace('_', ' ')} é obrigatório`)
          return false
        }
      }
    } else if (formData.client_type === 'company') {
      const companyFields = ['company_name', 'contact_person']
      for (const field of companyFields) {
        if (!formData[field as keyof GuestFormData]) {
          toast.error(`Campo ${field.replace('_', ' ')} é obrigatório`)
          return false
        }
      }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Email inválido')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)

    try {
      // Verificar se o email já existe
      const { data: existingGuest } = await supabase
        .from('guests')
        .select('id')
        .eq('email', formData.email)
        .single()

      if (existingGuest) {
        toast.error('Já existe um hóspede com este email')
        return
      }

      // Verificar se o documento já existe
      const { data: existingDocument } = await supabase
        .from('guests')
        .select('id')
        .eq('document_number', formData.document_number)
        .single()

      if (existingDocument) {
        toast.error('Já existe um hóspede com este número de documento')
        return
      }

      // Preparar dados baseado no tipo de cliente
      const insertData: any = {
        client_type: formData.client_type,
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        document_type: formData.document_type,
        document_number: formData.document_number.trim(),
        address: formData.address.trim() || null,
        nationality: formData.nationality
      }

      if (formData.client_type === 'individual') {
        insertData.first_name = formData.first_name.trim()
        insertData.last_name = formData.last_name.trim()
        insertData.date_of_birth = formData.date_of_birth || null
        insertData.company_name = null
        insertData.trade_name = null
        insertData.contact_person = null
      } else {
        insertData.first_name = null
        insertData.last_name = null
        insertData.date_of_birth = null
        insertData.company_name = formData.company_name.trim()
        insertData.trade_name = formData.trade_name.trim() || null
        insertData.contact_person = formData.contact_person.trim()
      }

      // Adicionar created_at com timezone local
      insertData.created_at = getLocalISOString()

      const { error } = await supabase
        .from('guests')
        .insert([insertData])

      if (error) throw error

      toast.success('Hóspede criado com sucesso!')
      router.push('/dashboard/guests')
    } catch (error) {
      toast.error('Erro ao criar hóspede')
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
          href="/dashboard/guests"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Hóspede</h1>
          <p className="text-gray-600 mt-2">
            Adicione um novo hóspede ao sistema
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Type Selection */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Tipo de Cliente
              </h2>
              <div className="flex space-x-6">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="client_type"
                    value="individual"
                    checked={formData.client_type === 'individual'}
                    onChange={handleInputChange}
                    className="mr-2 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Pessoa Física</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="client_type"
                    value="company"
                    checked={formData.client_type === 'company'}
                    onChange={handleInputChange}
                    className="mr-2 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Pessoa Jurídica</span>
                </label>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {formData.client_type === 'individual' ? 'Informações Pessoais' : 'Informações da Empresa'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Individual Fields */}
                {formData.client_type === 'individual' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome *
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Ex: João"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sobrenome *
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Ex: Silva"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Nascimento *
                      </label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        className="input-field"
                        required
                      />
                    </div>
                  </>
                )}

                {/* Company Fields */}
                {formData.client_type === 'company' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Razão Social *
                      </label>
                      <input
                        type="text"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Ex: Empresa LTDA"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome Fantasia
                      </label>
                      <input
                        type="text"
                        name="trade_name"
                        value={formData.trade_name}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Ex: Empresa"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pessoa de Contato *
                      </label>
                      <input
                        type="text"
                        name="contact_person"
                        value={formData.contact_person}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Ex: João Silva"
                        required
                      />
                    </div>
                  </>
                )}
                
                {/* Common Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Ex: contato@email.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Ex: (11) 99999-9999"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nacionalidade *
                  </label>
                  <select
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
                    <option value="">Selecione...</option>
                    {NATIONALITIES.map(nationality => (
                      <option key={nationality} value={nationality}>
                        {nationality}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Document Info */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Documentação
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Documento *
                  </label>
                  <select
                    name="document_type"
                    value={formData.document_type}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
                    <option value="">Selecione...</option>
                    {(formData.client_type === 'individual' ? DOCUMENT_TYPES_INDIVIDUAL : DOCUMENT_TYPES_COMPANY).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número do Documento *
                  </label>
                  <input
                    type="text"
                    name="document_number"
                    value={formData.document_number}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Ex: 123.456.789-00"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Endereço
              </h2>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="input-field"
                rows={3}
                placeholder="Endereço completo (opcional)..."
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Pré-visualização
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900">
                        {formData.client_type === 'individual' 
                          ? `${formData.first_name || 'Nome'} ${formData.last_name || 'Sobrenome'}`.trim()
                          : formData.company_name || formData.trade_name || 'Nome da Empresa'
                        }
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        formData.client_type === 'individual' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {formData.client_type === 'individual' ? 'PF' : 'PJ'}
                      </span>
                    </div>
                    {formData.client_type === 'company' && formData.contact_person && (
                      <div className="text-sm text-gray-600 mt-1">
                        Contato: {formData.contact_person}
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      {formData.document_type}: {formData.document_number || 'Número'}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <div>📧 {formData.email || 'email@exemplo.com'}</div>
                  <div>📱 {formData.phone || '(00) 00000-0000'}</div>
                  {formData.nationality && (
                    <div>🌍 {formData.nationality}</div>
                  )}
                  {formData.client_type === 'individual' && formData.date_of_birth && (
                    <div>🎂 {new Date(formData.date_of_birth).toLocaleDateString('pt-BR')}</div>
                  )}
                  {formData.client_type === 'company' && formData.trade_name && formData.trade_name !== formData.company_name && (
                    <div>🏢 {formData.trade_name}</div>
                  )}
                </div>
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
                      Criar Hóspede
                    </>
                  )}
                </button>
                
                <Link
                  href="/dashboard/guests"
                  className="btn-secondary w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Link>
              </div>
            </div>

            {/* Tips */}
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                💡 Dicas
              </h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Email deve ser único no sistema</li>
                <li>• Documento deve ser único</li>
                <li>• Telefone com DDD é recomendado</li>
                <li>• Endereço é opcional mas útil</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}