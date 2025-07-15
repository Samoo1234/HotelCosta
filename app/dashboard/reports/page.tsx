'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Users, 
  Bed,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import { formatCurrency, formatDateForInput } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ReportData {
  totalRevenue: number
  totalReservations: number
  totalGuests: number
  occupancyRate: number
  averageStay: number
  revenueGrowth: number
  reservationGrowth: number
  guestGrowth: number
}

interface MonthlyData {
  month: string
  revenue: number
  reservations: number
  guests: number
  occupancy: number
}

interface RoomTypeData {
  room_type: string
  count: number
  revenue: number
  occupancy: number
}

interface PaymentMethodData {
  method: string
  count: number
  total: number
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData>({
    totalRevenue: 0,
    totalReservations: 0,
    totalGuests: 0,
    occupancyRate: 0,
    averageStay: 0,
    revenueGrowth: 0,
    reservationGrowth: 0,
    guestGrowth: 0
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [roomTypeData, setRoomTypeData] = useState<RoomTypeData[]>([])
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30') // 30, 90, 365 days
  const supabase = createClient()

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - parseInt(dateRange))

      // Fetch all data
      const [reservationsData, paymentsData, guestsData, roomsData] = await Promise.all([
        supabase.from('reservations').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('guests').select('*'),
        supabase.from('rooms').select('*')
      ])

      const reservations = reservationsData.data || []
      const payments = paymentsData.data || []
      const guests = guestsData.data || []
      const rooms = roomsData.data || []

      // Calculate current period data
      const currentReservations = reservations.filter(r => 
        new Date(r.created_at) >= startDate && new Date(r.created_at) <= endDate
      )
      const currentPayments = payments.filter(p => 
        new Date(p.payment_date) >= startDate && new Date(p.payment_date) <= endDate
      )
      const currentGuests = guests.filter(g => 
        new Date(g.created_at) >= startDate && new Date(g.created_at) <= endDate
      )

      // Calculate previous period for growth comparison
      const prevStartDate = new Date(startDate)
      prevStartDate.setDate(prevStartDate.getDate() - parseInt(dateRange))
      const prevEndDate = new Date(startDate)

      const prevReservations = reservations.filter(r => 
        new Date(r.created_at) >= prevStartDate && new Date(r.created_at) < prevEndDate
      )
      const prevPayments = payments.filter(p => 
        new Date(p.payment_date) >= prevStartDate && new Date(p.payment_date) < prevEndDate
      )
      const prevGuests = guests.filter(g => 
        new Date(g.created_at) >= prevStartDate && new Date(g.created_at) < prevEndDate
      )

      // Calculate metrics
      const totalRevenue = currentPayments
        .filter(p => p.payment_status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)
      
      const prevRevenue = prevPayments
        .filter(p => p.payment_status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)

      const totalReservations = currentReservations.length
      const totalGuests = currentGuests.length
      
      // Calculate occupancy rate
      const totalRooms = rooms.length
      const occupiedDays = currentReservations.reduce((sum, r) => {
        const checkIn = new Date(r.check_in_date)
        const checkOut = new Date(r.check_out_date)
        const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        return sum + days
      }, 0)
      const totalPossibleDays = totalRooms * parseInt(dateRange)
      const occupancyRate = totalPossibleDays > 0 ? (occupiedDays / totalPossibleDays) * 100 : 0

      // Calculate average stay
      const totalStayDays = currentReservations.reduce((sum, r) => {
        const checkIn = new Date(r.check_in_date)
        const checkOut = new Date(r.check_out_date)
        const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        return sum + days
      }, 0)
      const averageStay = currentReservations.length > 0 ? totalStayDays / currentReservations.length : 0

      // Calculate growth rates
      const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
      const reservationGrowth = prevReservations.length > 0 ? 
        ((totalReservations - prevReservations.length) / prevReservations.length) * 100 : 0
      const guestGrowth = prevGuests.length > 0 ? 
        ((totalGuests - prevGuests.length) / prevGuests.length) * 100 : 0

      setReportData({
        totalRevenue,
        totalReservations,
        totalGuests,
        occupancyRate,
        averageStay,
        revenueGrowth,
        reservationGrowth,
        guestGrowth
      })

      // Generate monthly data for charts
      generateMonthlyData(reservations, payments, guests, rooms)
      generateRoomTypeData(reservations, payments, rooms)
      generatePaymentMethodData(currentPayments)

    } catch (error) {
      toast.error('Erro ao carregar dados dos relatórios')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateMonthlyData = (reservations: any[], payments: any[], guests: any[], rooms: any[]) => {
    const months = []
    const currentDate = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1)
      
      const monthReservations = reservations.filter(r => {
        const createdAt = new Date(r.created_at)
        return createdAt >= date && createdAt < nextDate
      })
      
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.payment_date)
        return paymentDate >= date && paymentDate < nextDate && p.payment_status === 'completed'
      })
      
      const monthGuests = guests.filter(g => {
        const createdAt = new Date(g.created_at)
        return createdAt >= date && createdAt < nextDate
      })
      
      const revenue = monthPayments.reduce((sum, p) => sum + p.amount, 0)
      
      months.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        revenue,
        reservations: monthReservations.length,
        guests: monthGuests.length,
        occupancy: 0 // Simplified for now
      })
    }
    
    setMonthlyData(months)
  }

  const generateRoomTypeData = async (reservations: any[], payments: any[], rooms: any[]) => {
    const roomTypeStats: { [key: string]: { count: number, revenue: number } } = {}
    
    for (const reservation of reservations) {
      const room = rooms.find(r => r.id === reservation.room_id)
      if (room) {
        const roomType = room.room_type
        if (!roomTypeStats[roomType]) {
          roomTypeStats[roomType] = { count: 0, revenue: 0 }
        }
        roomTypeStats[roomType].count++
        
        // Find payments for this reservation
        const reservationPayments = payments.filter(p => 
          p.reservation_id === reservation.id && p.payment_status === 'completed'
        )
        const revenue = reservationPayments.reduce((sum, p) => sum + p.amount, 0)
        roomTypeStats[roomType].revenue += revenue
      }
    }
    
    const roomTypeArray = Object.entries(roomTypeStats).map(([room_type, stats]) => ({
      room_type,
      count: stats.count,
      revenue: stats.revenue,
      occupancy: 0 // Simplified
    }))
    
    setRoomTypeData(roomTypeArray)
  }

  const generatePaymentMethodData = (payments: any[]) => {
    const methodStats: { [key: string]: { count: number, total: number } } = {}
    
    payments.forEach(payment => {
      const method = payment.payment_method
      if (!methodStats[method]) {
        methodStats[method] = { count: 0, total: 0 }
      }
      methodStats[method].count++
      if (payment.payment_status === 'completed') {
        methodStats[method].total += payment.amount
      }
    })
    
    const methodArray = Object.entries(methodStats).map(([method, stats]) => ({
      method,
      count: stats.count,
      total: stats.total
    }))
    
    setPaymentMethodData(methodArray)
  }

  const exportReport = () => {
    const csvContent = [
      ['Métrica', 'Valor'],
      ['Receita Total', formatCurrency(reportData.totalRevenue)],
      ['Total de Reservas', reportData.totalReservations.toString()],
      ['Total de Hóspedes', reportData.totalGuests.toString()],
      ['Taxa de Ocupação', `${reportData.occupancyRate.toFixed(1)}%`],
      ['Estadia Média', `${reportData.averageStay.toFixed(1)} dias`],
      ['Crescimento da Receita', `${reportData.revenueGrowth.toFixed(1)}%`],
      ['Crescimento de Reservas', `${reportData.reservationGrowth.toFixed(1)}%`],
      ['Crescimento de Hóspedes', `${reportData.guestGrowth.toFixed(1)}%`]
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-hotel-${formatDateForInput(new Date())}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Relatório exportado com sucesso!')
  }

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600'
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600">Análise detalhada do desempenho do hotel</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
          </select>
          <button
            onClick={exportReport}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
          <button
            onClick={fetchReportData}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.totalRevenue)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getGrowthIcon(reportData.revenueGrowth)}
            <span className={`ml-2 text-sm font-medium ${getGrowthColor(reportData.revenueGrowth)}`}>
              {reportData.revenueGrowth.toFixed(1)}%
            </span>
            <span className="ml-2 text-sm text-gray-500">vs período anterior</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reservas</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalReservations}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getGrowthIcon(reportData.reservationGrowth)}
            <span className={`ml-2 text-sm font-medium ${getGrowthColor(reportData.reservationGrowth)}`}>
              {reportData.reservationGrowth.toFixed(1)}%
            </span>
            <span className="ml-2 text-sm text-gray-500">vs período anterior</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hóspedes</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalGuests}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getGrowthIcon(reportData.guestGrowth)}
            <span className={`ml-2 text-sm font-medium ${getGrowthColor(reportData.guestGrowth)}`}>
              {reportData.guestGrowth.toFixed(1)}%
            </span>
            <span className="ml-2 text-sm text-gray-500">vs período anterior</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Ocupação</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.occupancyRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Bed className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              Estadia média: {reportData.averageStay.toFixed(1)} dias
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita Mensal</h3>
          <div className="space-y-3">
            {monthlyData.map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 w-16">{month.month}</span>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.max(5, (month.revenue / Math.max(...monthlyData.map(m => m.revenue))) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-24 text-right">
                  {formatCurrency(month.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Room Type Performance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Desempenho por Tipo de Quarto</h3>
          <div className="space-y-4">
            {roomTypeData.map((roomType, index) => (
              <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">{roomType.room_type}</span>
                  <span className="text-sm text-gray-600">{roomType.count} reservas</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Receita:</span>
                  <span className="font-medium text-green-600">{formatCurrency(roomType.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pagamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paymentMethodData.map((method, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-900 capitalize">
                  {method.method.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-600">{method.count} transações</span>
              </div>
              <div className="text-lg font-bold text-primary-600">
                {formatCurrency(method.total)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}