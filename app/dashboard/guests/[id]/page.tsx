'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Trash2, User, Calendar, MapPin, Phone, Mail, FileText, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Guest {
  id: string
  client_type: 'individual' | 'company'
  // Campos para pessoa física
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  // Campos para empresa
  company_name: string | null
  trade_name: string | null
  contact_person: string | null
  // Campos comuns
  email: string
  phone: string
  document_type: string
  document_number: string
  address: string | null
  nationality: string
  created_at: string
  updated_at: string
}

interface GuestStats {
  total_reservations: number
  total_spent: number
  last_stay: string | null
  average_stay_duration: number
  favorite_room_type: string | null
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

export default function EditGuestPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [stats, setStats] = useState<GuestStats | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchGuest()
      fetchGuestStats()
    }
  }, [params.id])

  const fetchGuest = async () => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setGuest(data)
    } catch (error) {
      toast.error('Erro ao carregar hóspede')
      console.error('Error:', error)
      router.push('/dashboard/guests')
    } finally {
      setLoading(false)
    }
  }

  const fetchGuestStats = async () => {
    try {
      // Buscar estatísticas das reservas
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select(`
          id,
          check_in_date,
          check_out_date,
          total_amount,
          rooms!inner(room_type)
        `)
        .eq('guest_id', params.id)

      if (error) throw error

      const totalReservations = reservations?.length || 0
      const totalSpent = reservations?.reduce((sum, res) => sum + (res.total_amount || 0), 0) || 0
      
      let lastStay = null
      let averageStayDuration = 0
      let favoriteRoomType = null

      if (reservations && reservations.length > 0) {
        // Última estadia
        const sortedReservations = reservations.sort((a, b) => 
          new Date(b.check_out_date).getTime() - new Date(a.check_out_date).getTime()
        )
        lastStay = sortedReservations[0].check_out_date

        // Duração média da estadia
        const totalDays = reservations.reduce((sum, res) => {
          const checkIn = new Date(res.check_in_date)
          const checkOut = new Date(res.check_out_date)
          return sum + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        }, 0)
        averageStayDuration = totalDays / reservations.length

        // Tipo de quarto favorito
        const roomTypeCounts = reservations.reduce((acc: Record<string, number>, res) => {
          const roomType = res.rooms?.[0]?.room_type || 'Desconhecido'
          acc[roomType] = (acc[roomType] || 0) + 1
          return acc
        }, {})
        
        favoriteRoomType = Object.entries(roomTypeCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || null
      }

      setStats({
        total_reservations: totalReservations,
        total_spent: totalSpent,
        last_stay: lastStay,
        average_stay_duration: averageStayDuration,
        favorite_room_type: favoriteRoomType
      })
    } catch (error) {
      console.error('Error fetching guest stats:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!guest) return
    
    const { name, value } = e.target
    setGuest(prev => prev ? {
      ...prev,
      [name]: value
    } : null)
  }

  const validateForm = () => {
    if (!guest) return false
    
    // Validação específica por tipo de cliente
    if (guest.client_type === 'individual') {
      if (!guest.first_name?.trim()) {
        toast.error('Nome é obrigatório')
        return false
      }
      if (!guest.last_name?.trim()) {
        toast.error('Sobrenome é obrigatório')
        return false
      }
      if (!guest.date_of_birth) {
        toast.error('Data de nascimento é obrigatória')
        return false
      }
    } else if (guest.client_type === 'company') {
      if (!guest.company_name?.trim()) {
        toast.error('Razão social é obrigatória')
        return false
      }
      if (!guest.contact_person?.trim()) {
        toast.error('Pessoa de contato é obrigatória')
        return false
      }
    }
    
    // Validações comuns
    if (!guest.email.trim()) {
      toast.error('Email é obrigatório')
      return false
    }
    if (!guest.email.includes('@')) {
      toast.error('Email deve ser válido')
      return false
    }
    if (!guest.phone.trim()) {
      toast.error('Telefone é obrigatório')
      return false
    }
    if (!guest.document_type) {
      toast.error('Tipo de documento é obrigatório')
      return false
    }
    if (!guest.document_number?.trim()) {
      toast.error('Número do documento é obrigatório')
      return false
    }
    if (!guest.nationality) {
       toast.error('Nacionalidade é obrigatória')
       return false
     }
     
     return true
   }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!guest || !validateForm()) return
    
    setSaving(true)

    try {
      // Verificar se o email já existe em outro hóspede
      const { data: existingGuest } = await supabase
        .from('guests')
        .select('id')
        .eq('email', guest.email)
        .neq('id', guest.id)
        .single()

      if (existingGuest) {
        toast.error('Já existe outro hóspede com este email')
        return
      }

      // Verificar se o documento já existe em outro hóspede
      const { data: existingDocument } = await supabase
        .from('guests')
        .select('id')
        .eq('document_number', guest.document_number)
        .neq('id', guest.id)
        .single()

      if (existingDocument) {
        toast.error('Já existe outro hóspede com este número de documento')
        return
      }

      // Preparar dados baseado no tipo de cliente
      const updateData: any = {
        client_type: guest.client_type,
        email: guest.email.trim().toLowerCase(),
        phone: guest.phone.trim(),
        document_type: guest.document_type,
        document_number: guest.document_number.trim(),
        address: guest.address?.trim() || null,
        nationality: guest.nationality,
        updated_at: new Date().toISOString()
      }

      if (guest.client_type === 'individual') {
        updateData.first_name = guest.first_name?.trim()
        updateData.last_name = guest.last_name?.trim()
        updateData.date_of_birth = guest.date_of_birth || null
        updateData.company_name = null
        updateData.trade_name = null
        updateData.contact_person = null
      } else {
        updateData.first_name = null
        updateData.last_name = null
        updateData.date_of_birth = null
        updateData.company_name = guest.company_name?.trim()
        updateData.trade_name = guest.trade_name?.trim() || null
        updateData.contact_person = guest.contact_person?.trim()
      }

      const { error } = await supabase
        .from('guests')
        .update(updateData)
        .eq('id', guest.id)

      if (error) throw error

      toast.success('Hóspede atualizado com sucesso!')
      fetchGuest() // Recarregar dados
    } catch (error) {
      toast.error('Erro ao atualizar hóspede')
      console.error('Error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!guest) return
    
    setDeleting(true)

    try {
      // Verificar se há reservas ativas
      const { data: activeReservations } = await supabase
        .from('reservations')
        .select('id')
        .eq('guest_id', guest.id)
        .in('status', ['confirmed', 'checked_in'])

      if (activeReservations && activeReservations.length > 0) {
        toast.error('Não é possível excluir hóspede com reservas ativas')
        return
      }

      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guest.id)

      if (error) throw error

      toast.success('Hóspede excluído com sucesso!')
      router.push('/dashboard/guests')
    } catch (error) {
      toast.error('Erro ao excluir hóspede')
      console.error('Error:', error)
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!guest) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Hóspede não encontrado</h2>
        <Link href="/dashboard/guests" className="btn-primary mt-4">
          Voltar para Hóspedes
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
            href="/dashboard/guests"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {guest.client_type === 'individual' 
                ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
                : guest.company_name || guest.trade_name || 'Empresa'
              }
            </h1>
            <p className="text-gray-600 mt-2">
              Editar informações do hóspede
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/guests/${guest.id}/details`}
            className="btn-outline"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Detalhes
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Type */}
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
                    checked={guest.client_type === 'individual'}
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
                    checked={guest.client_type === 'company'}
                    onChange={handleInputChange}
                    className="mr-2 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Pessoa Jurídica</span>
                </label>
              </div>
            </div>

            {/* Personal/Company Info */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {guest.client_type === 'individual' ? 'Informações Pessoais' : 'Informações da Empresa'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Individual Fields */}
                {guest.client_type === 'individual' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome *
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={guest.first_name || ''}
                        onChange={handleInputChange}
                        className="input-field"
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
                        value={guest.last_name || ''}
                        onChange={handleInputChange}
                        className="input-field"
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
                        value={guest.date_of_birth || ''}
                        onChange={handleInputChange}
                        className="input-field"
                        required
                      />
                    </div>
                  </>
                )}

                {/* Company Fields */}
                {guest.client_type === 'company' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Razão Social *
                      </label>
                      <input
                        type="text"
                        name="company_name"
                        value={guest.company_name || ''}
                        onChange={handleInputChange}
                        className="input-field"
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
                        value={guest.trade_name || ''}
                        onChange={handleInputChange}
                        className="input-field"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pessoa de Contato *
                      </label>
                      <input
                        type="text"
                        name="contact_person"
                        value={guest.contact_person || ''}
                        onChange={handleInputChange}
                        className="input-field"
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
                    value={guest.email}
                    onChange={handleInputChange}
                    className="input-field"
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
                    value={guest.phone}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nacionalidade *
                  </label>
                  <select
                    name="nationality"
                    value={guest.nationality}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
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
                    value={guest.document_type}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
                    {(guest.client_type === 'individual' ? DOCUMENT_TYPES_INDIVIDUAL : DOCUMENT_TYPES_COMPANY).map(type => (
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
                    value={guest.document_number}
                    onChange={handleInputChange}
                    className="input-field"
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
                value={guest.address || ''}
                onChange={handleInputChange}
                className="input-field"
                rows={3}
                placeholder="Endereço completo (opcional)..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <div className="flex items-center">
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
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Guest Info */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informações do Hóspede
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-3">
                  <div className="font-medium text-gray-900">
                    {guest.first_name} {guest.last_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {guest.document_type}: {guest.document_number}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {guest.email}
                </div>
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {guest.phone}
                </div>
                {guest.date_of_birth && (
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(guest.date_of_birth).toLocaleDateString('pt-BR')}
                  </div>
                )}
                <div className="flex items-center text-gray-600">
                  <FileText className="h-4 w-4 mr-2" />
                  {guest.nationality}
                </div>
                {guest.address && (
                  <div className="flex items-start text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                    <span className="text-xs">{guest.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Estatísticas
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total de Reservas:</span>
                  <span className="font-medium">{stats.total_reservations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Gasto:</span>
                  <span className="font-medium text-green-600">
                    R$ {stats.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {stats.last_stay && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Última Estadia:</span>
                    <span className="font-medium">
                      {new Date(stats.last_stay).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                {stats.average_stay_duration > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Estadia Média:</span>
                    <span className="font-medium">
                      {Math.round(stats.average_stay_duration)} dias
                    </span>
                  </div>
                )}
                {stats.favorite_room_type && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Quarto Favorito:</span>
                    <span className="font-medium">{stats.favorite_room_type}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="card bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Informações do Sistema
            </h3>
            <div className="space-y-1 text-xs text-gray-600">
              <div>Criado: {new Date(guest.created_at).toLocaleString('pt-BR')}</div>
              <div>Atualizado: {new Date(guest.updated_at).toLocaleString('pt-BR')}</div>
              <div>ID: {guest.id}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Exclusão
            </h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o hóspede <strong>{guest.first_name} {guest.last_name}</strong>? 
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Excluindo...
                  </div>
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}