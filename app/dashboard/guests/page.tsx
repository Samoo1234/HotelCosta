'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Plus, Search, Filter, User, Mail, Phone, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Guest {
  id: string
  client_type: 'individual' | 'company'
  // Campos para pessoa física
  first_name?: string
  last_name?: string
  date_of_birth?: string | null
  // Campos para empresa
  company_name?: string
  trade_name?: string
  contact_person?: string
  // Campos comuns
  email: string
  phone: string
  document_type: string
  document_number: string
  address: string | null
  nationality: string | null
  created_at: string
  updated_at: string
}

interface GuestWithStats extends Guest {
  total_reservations: number
  total_spent: number
  last_stay: string | null
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<GuestWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [nationalityFilter, setNationalityFilter] = useState<string>('all')
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchGuests()
  }, [])

  const fetchGuests = async () => {
    try {
      // Fetch guests with reservation statistics
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('*')
        .order('created_at', { ascending: false })

      if (guestsError) throw guestsError

      // Fetch reservation statistics for each guest
      const guestsWithStats = await Promise.all(
        (guestsData || []).map(async (guest) => {
          const { data: reservations } = await supabase
            .from('reservations')
            .select('total_amount, check_out_date')
            .eq('guest_id', guest.id)

          const totalReservations = reservations?.length || 0
          const totalSpent = reservations?.reduce((sum, res) => sum + res.total_amount, 0) || 0
          const lastStay = reservations && reservations.length > 0 
            ? reservations.sort((a, b) => new Date(b.check_out_date).getTime() - new Date(a.check_out_date).getTime())[0].check_out_date
            : null

          return {
            ...guest,
            total_reservations: totalReservations,
            total_spent: totalSpent,
            last_stay: lastStay
          }
        })
      )

      setGuests(guestsWithStats)
    } catch (error) {
      toast.error('Erro ao carregar hóspedes')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredGuests = guests.filter(guest => {
    const guestName = guest.client_type === 'individual' 
      ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
      : guest.company_name || guest.trade_name || ''
    
    const matchesSearch = 
      guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (guest.contact_person && guest.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
      guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.phone.includes(searchTerm) ||
      guest.document_number.includes(searchTerm)
    
    const matchesNationality = nationalityFilter === 'all' || guest.nationality === nationalityFilter
    const matchesDocumentType = documentTypeFilter === 'all' || guest.document_type === documentTypeFilter
    
    return matchesSearch && matchesNationality && matchesDocumentType
  })

  const nationalities = [...new Set(guests.map(guest => guest.nationality).filter((n): n is string => Boolean(n)))]
  const documentTypes = [...new Set(guests.map(guest => guest.document_type))]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-20 bg-gray-200 rounded mb-4"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Hóspedes</h1>
          <p className="text-gray-600 mt-2">
            Gerencie todos os hóspedes do seu hotel
          </p>
        </div>
        <Link href="/dashboard/guests/new" className="btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Novo Hóspede
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email, telefone ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <select
            value={nationalityFilter}
            onChange={(e) => setNationalityFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">Todas as Nacionalidades</option>
            {nationalities.map(nationality => (
              <option key={nationality} value={nationality}>
                {nationality}
              </option>
            ))}
          </select>
          
          <select
            value={documentTypeFilter}
            onChange={(e) => setDocumentTypeFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">Todos os Documentos</option>
            {documentTypes.map(type => (
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
          <div className="text-2xl font-bold text-gray-900">{guests.length}</div>
          <div className="text-sm text-gray-500">Total de Hóspedes</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {guests.filter(g => g.total_reservations > 0).length}
          </div>
          <div className="text-sm text-gray-500">Com Reservas</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {guests.filter(g => g.last_stay && new Date(g.last_stay) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
          </div>
          <div className="text-sm text-gray-500">Ativos (30d)</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(guests.reduce((sum, g) => sum + g.total_spent, 0))}
          </div>
          <div className="text-sm text-gray-500">Receita Total</div>
        </div>
      </div>

      {/* Guests Grid */}
      {filteredGuests.length === 0 ? (
        <div className="card text-center py-12">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum hóspede encontrado
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || nationalityFilter !== 'all' || documentTypeFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece adicionando o primeiro hóspede do seu hotel'
            }
          </p>
          <Link href="/dashboard/guests/new" className="btn-primary">
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Hóspede
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuests.map((guest) => (
            <div key={guest.id} className="card-hover">
              {/* Guest Avatar */}
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {guest.client_type === 'individual' 
                        ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
                        : guest.company_name || guest.trade_name
                      }
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      guest.client_type === 'individual' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {guest.client_type === 'individual' ? 'PF' : 'PJ'}
                    </span>
                  </div>
                  {guest.client_type === 'company' && guest.contact_person && (
                    <p className="text-sm text-gray-600 mt-1">
                      Contato: {guest.contact_person}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {guest.document_type}: {guest.document_number}
                  </p>
                </div>
              </div>
              
              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  <span className="truncate">{guest.email}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {guest.phone}
                </div>
                {guest.nationality && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {guest.nationality}
                  </div>
                )}
                {guest.date_of_birth && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(guest.date_of_birth).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {guest.total_reservations}
                  </div>
                  <div className="text-xs text-gray-500">Reservas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(guest.total_spent)}
                  </div>
                  <div className="text-xs text-gray-500">Gasto Total</div>
                </div>
              </div>
              
              {/* Last Stay */}
              {guest.last_stay && (
                <div className="text-xs text-gray-500 mb-4">
                  Última estadia: {new Date(guest.last_stay).toLocaleDateString('pt-BR')}
                </div>
              )}
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <Link
                  href={`/dashboard/guests/${guest.id}/details`}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  Ver Detalhes
                </Link>
                
                <Link
                  href={`/dashboard/guests/${guest.id}`}
                  className="btn-outline text-xs py-1 px-3"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}