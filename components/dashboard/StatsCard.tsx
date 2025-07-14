import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
  trend: 'up' | 'down'
  trendValue: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-100',
    icon: 'text-blue-600',
    trend: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-100',
    icon: 'text-green-600',
    trend: 'text-green-600',
  },
  purple: {
    bg: 'bg-purple-100',
    icon: 'text-purple-600',
    trend: 'text-purple-600',
  },
  orange: {
    bg: 'bg-orange-100',
    icon: 'text-orange-600',
    trend: 'text-orange-600',
  },
  red: {
    bg: 'bg-red-100',
    icon: 'text-red-600',
    trend: 'text-red-600',
  },
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color,
}: StatsCardProps) {
  const colors = colorClasses[color]
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={cn('p-3 rounded-lg', colors.bg)}>
          <Icon className={cn('h-6 w-6', colors.icon)} />
        </div>
      </div>
      
      <div className="flex items-center mt-4 pt-4 border-t border-gray-100">
        <div className={cn('flex items-center', 
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        )}>
          <TrendIcon className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">{trendValue}</span>
        </div>
        <span className="text-sm text-gray-500 ml-2">vs. mês anterior</span>
      </div>
    </div>
  )
}