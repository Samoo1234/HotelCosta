import { ReservationStatus } from '@/app/dashboard/reservations/[id]/details/actions';
import { Calendar, CheckCircle, Clock, LogIn, LogOut, X } from 'lucide-react';
import { useState } from 'react';

interface StatusHistoryItem {
  id: string;
  status: ReservationStatus;
  timestamp: string;
  user?: {
    name: string;
    email: string;
  };
  notes?: string;
  error?: {
    message: string;
    code?: string;
  };
}

interface ReservationStatusHistoryProps {
  history: StatusHistoryItem[];
  compact?: boolean;
}

/**
 * Component to display the history of status changes for a reservation
 * with detailed information about each change
 */
export default function ReservationStatusHistory({
  history,
  compact = false
}: ReservationStatusHistoryProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  
  // Sort history by timestamp (newest first)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Toggle expanded state for an item
  const toggleExpand = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Get icon for status
  const getStatusIcon = (status: ReservationStatus) => {
    switch (status) {
      case 'confirmed':
        return <Calendar className="h-5 w-5" />;
      case 'checked_in':
        return <LogIn className="h-5 w-5" />;
      case 'checked_out':
        return <LogOut className="h-5 w-5" />;
      case 'cancelled':
        return <X className="h-5 w-5" />;
      case 'no_show':
        return <Clock className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };
  
  // Get color for status
  const getStatusColor = (status: ReservationStatus) => {
    switch (status) {
      case 'confirmed':
        return 'text-blue-600 bg-blue-100';
      case 'checked_in':
        return 'text-green-600 bg-green-100';
      case 'checked_out':
        return 'text-gray-600 bg-gray-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'no_show':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  
  // Get label for status
  const getStatusLabel = (status: ReservationStatus) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'checked_in':
        return 'Check-in realizado';
      case 'checked_out':
        return 'Check-out realizado';
      case 'cancelled':
        return 'Cancelada';
      case 'no_show':
        return 'Não compareceu';
      default:
        return status;
    }
  };
  
  if (history.length === 0) {
    return (
      <div className="text-gray-500 text-sm italic">
        Nenhum histórico de status disponível
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {sortedHistory.map((item) => (
        <div 
          key={item.id}
          className={`border rounded-lg overflow-hidden ${
            item.error ? 'border-red-200' : 'border-gray-200'
          }`}
        >
          <div 
            className={`p-3 flex items-center justify-between cursor-pointer ${
              compact ? 'text-sm' : ''
            }`}
            onClick={() => toggleExpand(item.id)}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${getStatusColor(item.status)}`}>
                {getStatusIcon(item.status)}
              </div>
              
              <div>
                <div className="font-medium">
                  {getStatusLabel(item.status)}
                  {item.error && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                      Erro
                    </span>
                  )}
                </div>
                <div className="text-gray-500 text-xs">
                  {formatDate(item.timestamp)}
                </div>
              </div>
            </div>
            
            <div className="text-gray-400">
              {expandedItem === item.id ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
          
          {expandedItem === item.id && (
            <div className={`px-3 pb-3 pt-0 border-t border-gray-100 ${compact ? 'text-sm' : ''}`}>
              {item.user && (
                <div className="mb-2">
                  <span className="text-gray-500 text-xs">Alterado por:</span>
                  <div className="text-gray-700">{item.user.name}</div>
                  <div className="text-gray-500 text-xs">{item.user.email}</div>
                </div>
              )}
              
              {item.notes && (
                <div className="mb-2">
                  <span className="text-gray-500 text-xs">Observações:</span>
                  <div className="text-gray-700">{item.notes}</div>
                </div>
              )}
              
              {item.error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-red-700 text-xs">
                  <div className="font-medium">Erro ocorrido:</div>
                  <div>{item.error.message}</div>
                  {item.error.code && (
                    <div className="mt-1 text-red-500">
                      Código: {item.error.code}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}