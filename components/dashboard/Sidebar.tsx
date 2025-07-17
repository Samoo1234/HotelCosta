'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  LayoutDashboard,
  Bed,
  Users,
  Calendar,
  CreditCard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Quartos',
    href: '/dashboard/rooms',
    icon: Bed,
  },
  {
    name: 'Hóspedes',
    href: '/dashboard/guests',
    icon: Users,
  },
  {
    name: 'Reservas',
    href: '/dashboard/reservations',
    icon: Calendar,
  },
  {
    name: 'Pagamentos',
    href: '/dashboard/payments',
    icon: CreditCard,
  },
  {
    name: 'Produtos',
    href: '/dashboard/products',
    icon: Package,
  },
  {
    name: 'Consumos',
    href: '/dashboard/consumptions',
    icon: ShoppingCart,
  },
  {
    name: 'Relatórios',
    href: '/dashboard/reports',
    icon: BarChart3,
  },
  {
    name: 'Configurações',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  mobileOpen?: boolean
  setMobileOpen?: (open: boolean) => void
}

export default function Sidebar({ mobileOpen = false, setMobileOpen }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  // Auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true)
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    if (setMobileOpen) {
      setMobileOpen(false)
    }
  }, [pathname, setMobileOpen])

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileOpen?.(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          'bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col z-50',
          // Desktop styles
          'hidden md:flex',
          collapsed ? 'w-16' : 'w-64',
          // Mobile styles
          'md:relative md:translate-x-0',
          mobileOpen ? 'fixed inset-y-0 left-0 w-64 flex' : 'hidden'
        )}
      >
        {/* Mobile close button */}
        {mobileOpen && (
          <div className="absolute top-4 right-4 md:hidden">
            <button
              onClick={() => setMobileOpen?.(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {(!collapsed || mobileOpen) && (
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">HotelManager</span>
            </div>
          )}
          {/* Desktop collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200',
                  isActive
                    ? 'bg-primary-100 text-primary-800 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                  collapsed && !mobileOpen ? 'justify-center' : 'justify-start'
                )}
                title={collapsed && !mobileOpen ? item.name : undefined}
              >
                <item.icon className={cn('h-5 w-5', collapsed && !mobileOpen ? '' : 'mr-3')} />
                {(!collapsed || mobileOpen) && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        {(!collapsed || mobileOpen) && (
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              © 2024 HotelManager
            </div>
          </div>
        )}
      </div>
    </>
  )
}