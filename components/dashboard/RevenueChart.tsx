'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

// Mock data for demonstration
const data = [
  { day: '1', revenue: 2400 },
  { day: '5', revenue: 1398 },
  { day: '10', revenue: 9800 },
  { day: '15', revenue: 3908 },
  { day: '20', revenue: 4800 },
  { day: '25', revenue: 3800 },
  { day: '30', revenue: 4300 },
]

export default function RevenueChart() {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="day" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: number) => [formatCurrency(value), 'Receita']}
            labelFormatter={(label) => `Dia ${label}`}
            labelStyle={{ color: '#374151' }}
          />
          <Bar 
            dataKey="revenue" 
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}