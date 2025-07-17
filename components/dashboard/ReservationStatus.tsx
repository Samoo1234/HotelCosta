import { Calendar, LogIn, LogOut, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReservationStatusProps {
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  size?: 'sm' | 'md' | 'lg';
}

export default function ReservationStatus({ status, size = 'md' }: ReservationStatusProps) {
  const statusConfig = {
    confirmed: {
      label: 'Confirmada',
      color: 'bg-blue-100 text-blue-800',
      icon: Calendar
    },
    checked_in: {
      label: 'Check-in',
      color: 'bg-green-100 text-green-800',
      icon: LogIn
    },
    checked_out: {
      label: 'Check-out',
      color: 'bg-gray-100 text-gray-800',
      icon: LogOut
    },
    cancelled: {
      label: 'Cancelada',
      color: 'bg-red-100 text-red-800',
      icon: X
    },
    no_show: {
      label: 'Não Compareceu',
      color: 'bg-orange-100 text-orange-800',
      icon: AlertCircle
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <span className={cn(`inline-flex items-center rounded-full font-medium ${config.color}`, sizeClasses[size])}>
      <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5')} />
      {config.label}
    </span>
  );
}