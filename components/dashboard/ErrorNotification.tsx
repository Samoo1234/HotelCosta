import { AlertTriangle, AlertCircle, Info, X, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

interface ErrorNotificationProps {
  type: NotificationType;
  title: string;
  message: string;
  suggestions?: string[];
  onClose?: () => void;
  dismissible?: boolean;
}

export default function ErrorNotification({
  type = 'error',
  title,
  message,
  suggestions = [],
  onClose,
  dismissible = true
}: ErrorNotificationProps) {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed) return null;
  
  const handleDismiss = () => {
    setDismissed(true);
    if (onClose) onClose();
  };
  
  // Configure styles based on notification type
  const config = {
    error: {
      containerClass: 'bg-red-50 border-red-200',
      iconClass: 'text-red-600',
      titleClass: 'text-red-800',
      messageClass: 'text-red-700',
      icon: AlertCircle,
      suggestionClass: 'text-red-700'
    },
    warning: {
      containerClass: 'bg-yellow-50 border-yellow-200',
      iconClass: 'text-yellow-600',
      titleClass: 'text-yellow-800',
      messageClass: 'text-yellow-700',
      icon: AlertTriangle,
      suggestionClass: 'text-yellow-700'
    },
    info: {
      containerClass: 'bg-blue-50 border-blue-200',
      iconClass: 'text-blue-600',
      titleClass: 'text-blue-800',
      messageClass: 'text-blue-700',
      icon: Info,
      suggestionClass: 'text-blue-700'
    },
    success: {
      containerClass: 'bg-green-50 border-green-200',
      iconClass: 'text-green-600',
      titleClass: 'text-green-800',
      messageClass: 'text-green-700',
      icon: CheckCircle,
      suggestionClass: 'text-green-700'
    }
  };
  
  const { containerClass, iconClass, titleClass, messageClass, icon: Icon, suggestionClass } = config[type];
  
  return (
    <div className={`p-4 border rounded-lg ${containerClass} relative`}>
      {dismissible && (
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      
      <div className="flex items-start">
        <div className={`mr-3 ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1">
          {title && (
            <h4 className={`font-medium ${titleClass}`}>
              {title}
            </h4>
          )}
          
          <p className={`text-sm mt-1 ${messageClass}`}>
            {message}
          </p>
          
          {suggestions && suggestions.length > 0 && (
            <div className="mt-3">
              <h5 className={`text-xs font-medium mb-1 ${suggestionClass}`}>
                Sugestões:
              </h5>
              <ul className={`list-disc pl-5 text-xs space-y-1 ${suggestionClass}`}>
                {suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}