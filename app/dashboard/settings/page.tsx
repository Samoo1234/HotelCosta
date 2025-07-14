'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { 
  Settings, 
  Building2, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Mail, 
  Phone, 
  MapPin, 
  Save, 
  RefreshCw,
  Eye,
  EyeOff,
  Key,
  Globe,
  Clock,
  DollarSign
} from 'lucide-react'
import toast from 'react-hot-toast'

interface HotelSettings {
  id?: string
  name: string
  address: string
  phone: string
  email: string
  description: string
  check_in_time: string
  check_out_time: string
  currency: string
  timezone: string
  website?: string
  tax_rate: number
}

interface SystemSettings {
  auto_backup: boolean
  email_notifications: boolean
  sms_notifications: boolean
  maintenance_mode: boolean
  debug_mode: boolean
  max_reservation_days: number
  cancellation_hours: number
  late_checkout_fee: number
}

interface NotificationSettings {
  new_reservation: boolean
  payment_received: boolean
  check_in_reminder: boolean
  check_out_reminder: boolean
  maintenance_alerts: boolean
  low_occupancy_alerts: boolean
  email_frequency: 'immediate' | 'daily' | 'weekly'
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('hotel')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const supabase = createClient()

  // Hotel Settings
  const [hotelSettings, setHotelSettings] = useState<HotelSettings>({
    name: '',
    address: '',
    phone: '',
    email: '',
    description: '',
    check_in_time: '14:00',
    check_out_time: '12:00',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    website: '',
    tax_rate: 0
  })

  // System Settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    auto_backup: true,
    email_notifications: true,
    sms_notifications: false,
    maintenance_mode: false,
    debug_mode: false,
    max_reservation_days: 365,
    cancellation_hours: 24,
    late_checkout_fee: 50
  })

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    new_reservation: true,
    payment_received: true,
    check_in_reminder: true,
    check_out_reminder: true,
    maintenance_alerts: true,
    low_occupancy_alerts: false,
    email_frequency: 'immediate'
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Load hotel settings
      const { data: hotelData, error: hotelError } = await supabase
        .from('hotels')
        .select('*')
        .limit(1)
        .single()

      if (hotelData && !hotelError) {
        setHotelSettings({
          id: hotelData.id,
          name: hotelData.name || '',
          address: hotelData.address || '',
          phone: hotelData.phone || '',
          email: hotelData.email || '',
          description: hotelData.description || '',
          check_in_time: hotelData.check_in_time || '14:00',
          check_out_time: hotelData.check_out_time || '12:00',
          currency: hotelData.currency || 'BRL',
          timezone: hotelData.timezone || 'America/Sao_Paulo',
          website: hotelData.website || '',
          tax_rate: hotelData.tax_rate || 0
        })
      }

      // Load system settings from localStorage or default values
      const savedSystemSettings = localStorage.getItem('systemSettings')
      if (savedSystemSettings) {
        setSystemSettings(JSON.parse(savedSystemSettings))
      }

      const savedNotificationSettings = localStorage.getItem('notificationSettings')
      if (savedNotificationSettings) {
        setNotificationSettings(JSON.parse(savedNotificationSettings))
      }

    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const saveHotelSettings = async () => {
    setSaving(true)
    try {
      if (hotelSettings.id) {
        // Update existing hotel
        const { error } = await supabase
          .from('hotels')
          .update({
            name: hotelSettings.name,
            address: hotelSettings.address,
            phone: hotelSettings.phone,
            email: hotelSettings.email,
            description: hotelSettings.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', hotelSettings.id)

        if (error) throw error
      } else {
        // Create new hotel
        const { data, error } = await supabase
          .from('hotels')
          .insert([{
            name: hotelSettings.name,
            address: hotelSettings.address,
            phone: hotelSettings.phone,
            email: hotelSettings.email,
            description: hotelSettings.description
          }])
          .select()
          .single()

        if (error) throw error
        if (data) {
          setHotelSettings(prev => ({ ...prev, id: data.id }))
        }
      }

      toast.success('Configurações do hotel salvas com sucesso!')
    } catch (error) {
      console.error('Error saving hotel settings:', error)
      toast.error('Erro ao salvar configurações do hotel')
    } finally {
      setSaving(false)
    }
  }

  const saveSystemSettings = () => {
    setSaving(true)
    try {
      localStorage.setItem('systemSettings', JSON.stringify(systemSettings))
      toast.success('Configurações do sistema salvas com sucesso!')
    } catch (error) {
      console.error('Error saving system settings:', error)
      toast.error('Erro ao salvar configurações do sistema')
    } finally {
      setSaving(false)
    }
  }

  const saveNotificationSettings = () => {
    setSaving(true)
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings))
      toast.success('Configurações de notificação salvas com sucesso!')
    } catch (error) {
      console.error('Error saving notification settings:', error)
      toast.error('Erro ao salvar configurações de notificação')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    if (confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
      localStorage.removeItem('systemSettings')
      localStorage.removeItem('notificationSettings')
      loadSettings()
      toast.success('Configurações restauradas para o padrão!')
    }
  }

  const tabs = [
    { id: 'hotel', name: 'Hotel', icon: Building2 },
    { id: 'system', name: 'Sistema', icon: Settings },
    { id: 'notifications', name: 'Notificações', icon: Bell },
    { id: 'security', name: 'Segurança', icon: Shield }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600">Gerencie as configurações do sistema e do hotel</p>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Restaurar Padrão
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Hotel Settings */}
        {activeTab === 'hotel' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Configurações do Hotel</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Hotel
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={hotelSettings.name}
                    onChange={(e) => setHotelSettings(prev => ({ ...prev, name: e.target.value }))}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nome do seu hotel"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={hotelSettings.email}
                    onChange={(e) => setHotelSettings(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="contato@hotel.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={hotelSettings.phone}
                    onChange={(e) => setHotelSettings(prev => ({ ...prev, phone: e.target.value }))}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="(11) 1234-5678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    value={hotelSettings.website}
                    onChange={(e) => setHotelSettings(prev => ({ ...prev, website: e.target.value }))}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="https://www.hotel.com"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    value={hotelSettings.address}
                    onChange={(e) => setHotelSettings(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Endereço completo do hotel"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={hotelSettings.description}
                  onChange={(e) => setHotelSettings(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Descrição do hotel para os hóspedes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário Check-in
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    value={hotelSettings.check_in_time}
                    onChange={(e) => setHotelSettings(prev => ({ ...prev, check_in_time: e.target.value }))}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário Check-out
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    value={hotelSettings.check_out_time}
                    onChange={(e) => setHotelSettings(prev => ({ ...prev, check_out_time: e.target.value }))}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moeda
                </label>
                <select
                  value={hotelSettings.currency}
                  onChange={(e) => setHotelSettings(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="BRL">Real (BRL)</option>
                  <option value="USD">Dólar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa de Imposto (%)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={hotelSettings.tax_rate}
                    onChange={(e) => setHotelSettings(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={saveHotelSettings}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </button>
            </div>
          </div>
        )}

        {/* System Settings */}
        {activeTab === 'system' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Configurações do Sistema</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Geral</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Backup Automático</label>
                      <p className="text-xs text-gray-500">Backup diário dos dados</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={systemSettings.auto_backup}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, auto_backup: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Modo Manutenção</label>
                      <p className="text-xs text-gray-500">Desabilita acesso público</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={systemSettings.maintenance_mode}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, maintenance_mode: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Modo Debug</label>
                      <p className="text-xs text-gray-500">Logs detalhados do sistema</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={systemSettings.debug_mode}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, debug_mode: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Reservas</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Máximo de dias para reserva
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="730"
                      value={systemSettings.max_reservation_days}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, max_reservation_days: parseInt(e.target.value) || 365 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horas para cancelamento gratuito
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="168"
                      value={systemSettings.cancellation_hours}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, cancellation_hours: parseInt(e.target.value) || 24 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Taxa de check-out tardio (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={systemSettings.late_checkout_fee}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, late_checkout_fee: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={saveSystemSettings}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </button>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Configurações de Notificação</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Notificações por Email</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nova Reserva</label>
                      <p className="text-xs text-gray-500">Notificar sobre novas reservas</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.new_reservation}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, new_reservation: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Pagamento Recebido</label>
                      <p className="text-xs text-gray-500">Notificar sobre pagamentos</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.payment_received}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, payment_received: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Lembrete Check-in</label>
                      <p className="text-xs text-gray-500">Lembrete 1 dia antes</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.check_in_reminder}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, check_in_reminder: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Lembrete Check-out</label>
                      <p className="text-xs text-gray-500">Lembrete no dia do check-out</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.check_out_reminder}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, check_out_reminder: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Alertas do Sistema</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Alertas de Manutenção</label>
                      <p className="text-xs text-gray-500">Problemas no sistema</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.maintenance_alerts}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, maintenance_alerts: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Baixa Ocupação</label>
                      <p className="text-xs text-gray-500">Alertas de ocupação baixa</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.low_occupancy_alerts}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, low_occupancy_alerts: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequência de Email
                    </label>
                    <select
                      value={notificationSettings.email_frequency}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, email_frequency: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="immediate">Imediato</option>
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={saveNotificationSettings}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </button>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Configurações de Segurança</h3>
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <Shield className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Configurações de Segurança</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      As configurações de segurança são gerenciadas pelo Supabase. 
                      Para alterar senhas, políticas de acesso ou configurações de autenticação, 
                      acesse o painel do Supabase.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Informações de Segurança</h4>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Autenticação</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Ativo</span>
                    </div>
                    <p className="text-xs text-gray-500">Sistema de login seguro com Supabase</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Criptografia</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">SSL/TLS</span>
                    </div>
                    <p className="text-xs text-gray-500">Dados protegidos com criptografia</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Backup</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Automático</span>
                    </div>
                    <p className="text-xs text-gray-500">Backup automático dos dados</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Ações de Segurança</h4>
                  
                  <button className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Key className="h-4 w-4 mr-2" />
                    Alterar Senha
                  </button>

                  <button className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Database className="h-4 w-4 mr-2" />
                    Backup Manual
                  </button>

                  <button className="w-full flex items-center justify-center px-4 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors">
                    <Shield className="h-4 w-4 mr-2" />
                    Log de Segurança
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}