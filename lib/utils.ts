import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function generateReservationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'available':
    case 'confirmed':
    case 'completed':
      return 'status-available'
    case 'occupied':
    case 'checked_in':
    case 'pending':
      return 'status-occupied'
    case 'maintenance':
    case 'cancelled':
    case 'failed':
      return 'status-maintenance'
    case 'reserved':
    case 'checked_out':
    case 'refunded':
      return 'status-reserved'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    available: 'Disponível',
    occupied: 'Ocupado',
    maintenance: 'Manutenção',
    reserved: 'Reservado',
    confirmed: 'Confirmado',
    checked_in: 'Check-in',
    checked_out: 'Check-out',
    cancelled: 'Cancelado',
    pending: 'Pendente',
    completed: 'Concluído',
    failed: 'Falhou',
    refunded: 'Reembolsado',
  }
  return statusMap[status.toLowerCase()] || status
}