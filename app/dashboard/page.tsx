import { Building2, Users, Calendar, CreditCard, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { createServerClient } from '@/lib/supabase'
import StatsCard from '@/components/dashboard/StatsCard'
import RecentReservations from '@/components/dashboard/RecentReservations'
import OccupancyChart from '@/components/dashboard/OccupancyChart'
import RevenueChart from '@/components/dashboard/RevenueChart'

export default async function DashboardPage() {
  const supabase = createServerClient()

  // Fetch dashboard data
  const [roomsData, guestsData, reservationsData, paymentsData] = await Promise.all([
    supabase.from('rooms').select('*'),
    supabase.from('guests').select('*'),
    supabase.from('reservations').select('*'),
    supabase.from('payments').select('*'),
  ])

  const rooms = roomsData.data || []
  const guests = guestsData.data || []
  const reservations = reservationsData.data || []
  const payments = paymentsData.data || []

  // Calculate metrics
  const totalRooms = rooms.length
  const occupiedRooms = rooms.filter(room => room.status === 'occupied').length
  const availableRooms = rooms.filter(room => room.status === 'available').length
  const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0

  const totalGuests = guests.length
  const activeReservations = reservations.filter(r => r.status === 'confirmed' || r.status === 'checked_in').length
  
  const totalRevenue = payments
    .filter(p => p.payment_status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0)

  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const monthlyRevenue = payments
    .filter(p => {
      const paymentDate = new Date(p.payment_date)
      return p.payment_status === 'completed' && 
             paymentDate.getMonth() === thisMonth && 
             paymentDate.getFullYear() === thisYear
    })
    .reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Visão geral do seu hotel em tempo real
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Taxa de Ocupação"
          value={`${occupancyRate.toFixed(1)}%`}
          subtitle={`${occupiedRooms}/${totalRooms} quartos ocupados`}
          icon={Building2}
          trend={occupancyRate > 70 ? 'up' : 'down'}
          trendValue="+5.2%"
          color="blue"
        />
        
        <StatsCard
          title="Hóspedes Ativos"
          value={activeReservations.toString()}
          subtitle={`${totalGuests} hóspedes cadastrados`}
          icon={Users}
          trend="up"
          trendValue="+12.5%"
          color="green"
        />
        
        <StatsCard
          title="Reservas Ativas"
          value={activeReservations.toString()}
          subtitle="Confirmadas e check-in"
          icon={Calendar}
          trend="up"
          trendValue="+8.1%"
          color="purple"
        />
        
        <StatsCard
          title="Receita Mensal"
          value={formatCurrency(monthlyRevenue)}
          subtitle={`Total: ${formatCurrency(totalRevenue)}`}
          icon={CreditCard}
          trend={monthlyRevenue > 10000 ? 'up' : 'down'}
          trendValue="+15.3%"
          color="orange"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Taxa de Ocupação (7 dias)
          </h3>
          <OccupancyChart />
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Receita (30 dias)
          </h3>
          <RevenueChart />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentReservations />
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Status dos Quartos
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Disponíveis</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{availableRooms}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Ocupados</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{occupiedRooms}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Manutenção</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {rooms.filter(r => r.status === 'maintenance').length}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Reservados</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {rooms.filter(r => r.status === 'reserved').length}
              </span>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalRooms}</div>
              <div className="text-sm text-gray-500">Total de Quartos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}