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
  
  // Use the provided timezone to format the date properly
  try {
    // Get the timezone offset for the specified timezone
    const offset = getTimezoneOffset(timezone)
    
    // Apply the offset to get the correct time in the specified timezone
    const localTime = new Date(now.getTime() + offset)
    
    // Format as ISO string but remove the Z at the end
    const isoString = localTime.toISOString().slice(0, -1)
    
    // Calculate the offset in hours and minutes for formatting
    const offsetInHours = offset / (60 * 60 * 1000)
    const offsetHours = Math.floor(Math.abs(offsetInHours))
    const offsetMinutes = Math.floor((Math.abs(offsetInHours) - offsetHours) * 60)
    
    // Format the offset string (e.g., -03:00 or +05:30)
    const offsetSign = offsetInHours <= 0 ? '-' : '+'
    const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`
    
    return isoString + offsetString
  } catch (error) {
    console.error('Error in getLocalISOString:', error)
    // Fallback to a simpler approach
    const isoString = now.toISOString().slice(0, -1)
    return isoString + '-03:00' // Default to São Paulo timezone as fallback
  }
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

export function getTimezoneOffset(timezone: string): number {
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