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

export function formatDate(date: string | Date, timezone: string = 'America/Sao_Paulo'): string {
  try {
    let dateObj: Date
    if (date instanceof Date) {
      dateObj = date
    } else {
      dateObj = new Date(date)
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date)
      return 'Data inválida'
    }
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: timezone,
    }).format(dateObj)
  } catch (error) {
    console.error('Error formatting date:', error, date)
    return 'Data inválida'
  }
}

export function formatDateTime(date: string | Date, timezone: string = 'America/Sao_Paulo'): string {
  try {
    let dateObj: Date
    if (date instanceof Date) {
      dateObj = date
    } else {
      dateObj = new Date(date)
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date)
      return 'Data inválida'
    }
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).format(dateObj)
  } catch (error) {
    console.error('Error formatting date:', error, date)
    return 'Data inválida'
  }
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Utility functions for timezone handling
export function getLocalISOString(timezone: string = 'America/Sao_Paulo'): string {
  const now = new Date()
  
  // Para America/Sao_Paulo (UTC-3), vamos subtrair 3 horas do UTC
  const offsetHours = -3 // UTC-3 para America/Sao_Paulo
  const localTime = new Date(now.getTime() + (offsetHours * 60 * 60 * 1000))
  
  // Format as ISO string with timezone offset
  const isoString = localTime.toISOString().slice(0, -1) // Remove 'Z'
  return isoString + '-03:00' // Add the timezone offset
}

export function formatDateForInput(date: string | Date, timezone: string = 'America/Sao_Paulo'): string {
  const d = new Date(date)
  return d.toLocaleDateString('sv-SE', { timeZone: timezone })
}

export function createTimezoneAwareDate(dateStr: string, timeStr: string, timezone: string = 'America/Sao_Paulo'): Date {
  // Create date in the specified timezone
  const dateTimeStr = `${dateStr}T${timeStr}:00`
  const tempDate = new Date(dateTimeStr)
  
  // Get the timezone offset for the specified timezone
  const utcTime = tempDate.getTime() + (tempDate.getTimezoneOffset() * 60000)
  const targetTime = new Date(utcTime + getTimezoneOffset(timezone))
  return targetTime
}

function getTimezoneOffset(timezone: string): number {
  const now = new Date()
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000))
  const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }))
  return target.getTime() - utc.getTime()
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