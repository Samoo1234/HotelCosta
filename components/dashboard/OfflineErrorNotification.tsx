import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Save } from 'lucide-react';

interface OfflineErrorNotificationProps {
  message?: string;
  onRetry?: () => void;
  showOfflineQueue?: boolean;
  queuedActions?: number;
  onProcessQueue?: () => void;
}

/**
 * Component for displaying offline error notifications with retry functionality
 * and offline queue information
 */
export default function OfflineErrorNotification({
  message = 'Você está offline. Algumas funcionalidades podem não estar disponíveis.',
  onRetry,
  showOfflineQueue = false,
  queuedActions = 0,
  onProcessQueue
}: OfflineErrorNotificationProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // If online and no queued actions, don't show anything
  if (isOnline && (!showOfflineQueue || queuedActions === 0)) {
    return null;
  }
  
  return (
    <div className="p-4 border rounded-lg bg-gray-50 border-gray-200">
      <div className="flex items-start">
        <div className="mr-3 text-gray-600">
          <WifiOff className="h-5 w-5" />
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium text-gray-800">
            {!isOnline ? 'Sem conexão com a internet' : 'Ações pendentes'}
          </h4>
          
          <p className="text-sm mt-1 text-gray-700">
            {!isOnline ? message : `Você tem ${queuedActions} ${queuedActions === 1 ? 'ação pendente' : 'ações pendentes'} para sincronizar.`}
          </p>
          
          <div className="mt-3 flex space-x-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center text-xs px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Tentar novamente
              </button>
            )}
            
            {isOnline && showOfflineQueue && queuedActions > 0 && onProcessQueue && (
              <button
                onClick={onProcessQueue}
                className="flex items-center text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-3 w-3 mr-1" />
                Sincronizar agora
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for tracking online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}