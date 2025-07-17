import { AlertTriangle, AlertCircle, Info, X, CheckCircle, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { ValidationResult } from './ReservationActionErrorHandler';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

interface DetailedErrorNotificationProps {
  type: NotificationType;
  title: string;
  message: string;
  suggestions?: string[];
  errorCode?: string;
  errorDetails?: any;
  context?: string;
  onClose?: () => void;
  dismissible?: boolean;
  showHelp?: boolean;
  helpText?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Enhanced error notification component that provides more detailed information
 * and suggestions for resolving issues
 */
export default function DetailedErrorNotification({
  type = 'error',
  title,
  message,
  suggestions = [],
  errorCode,
  errorDetails,
  context,
  onClose,
  dismissible = true,
  showHelp = false,
  helpText,
  actionButton
}: DetailedErrorNotificationProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
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
      suggestionClass: 'text-red-700',
      detailsClass: 'bg-red-100 text-red-800',
      buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      containerClass: 'bg-yellow-50 border-yellow-200',
      iconClass: 'text-yellow-600',
      titleClass: 'text-yellow-800',
      messageClass: 'text-yellow-700',
      icon: AlertTriangle,
      suggestionClass: 'text-yellow-700',
      detailsClass: 'bg-yellow-100 text-yellow-800',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    info: {
      containerClass: 'bg-blue-50 border-blue-200',
      iconClass: 'text-blue-600',
      titleClass: 'text-blue-800',
      messageClass: 'text-blue-700',
      icon: Info,
      suggestionClass: 'text-blue-700',
      detailsClass: 'bg-blue-100 text-blue-800',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    success: {
      containerClass: 'bg-green-50 border-green-200',
      iconClass: 'text-green-600',
      titleClass: 'text-green-800',
      messageClass: 'text-green-700',
      icon: CheckCircle,
      suggestionClass: 'text-green-700',
      detailsClass: 'bg-green-100 text-green-800',
      buttonClass: 'bg-green-600 hover:bg-green-700 text-white'
    }
  };
  
  const { 
    containerClass, 
    iconClass, 
    titleClass, 
    messageClass, 
    icon: Icon, 
    suggestionClass,
    detailsClass,
    buttonClass
  } = config[type];
  
  // Log error details if they exist and this is an error notification
  if (type === 'error' && errorDetails && context) {
    console.error(`Error in ${context}:`, {
      message,
      error_code: errorCode,
      details: errorDetails
    });
  }
  
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
          <div className="flex items-center">
            {title && (
              <h4 className={`font-medium ${titleClass}`}>
                {title}
              </h4>
            )}
            
            {errorCode && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${detailsClass}`}>
                Código: {errorCode}
              </span>
            )}
          </div>
          
          <p className={`text-sm mt-1 ${messageClass}`}>
            {message}
          </p>
          
          {suggestions && suggestions.length > 0 && (
            <div className="mt-3">
              <h5 className={`text-xs font-medium mb-1 ${suggestionClass}`}>
                Sugestões para resolver:
              </h5>
              <ul className={`list-disc pl-5 text-xs space-y-1 ${suggestionClass}`}>
                {suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          
          {showHelp && helpText && (
            <div className="mt-3 flex items-start">
              <HelpCircle className={`h-4 w-4 mr-1 ${iconClass}`} />
              <p className={`text-xs ${messageClass}`}>
                {helpText}
              </p>
            </div>
          )}
          
          {errorDetails && (
            <div className="mt-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`text-xs flex items-center ${suggestionClass}`}
              >
                {showDetails ? 'Ocultar detalhes técnicos' : 'Mostrar detalhes técnicos'}
              </button>
              
              {showDetails && (
                <pre className={`mt-2 p-2 rounded text-xs overflow-auto max-h-32 ${detailsClass}`}>
                  {typeof errorDetails === 'object' 
                    ? JSON.stringify(errorDetails, null, 2)
                    : String(errorDetails)
                  }
                </pre>
              )}
            </div>
          )}
          
          {actionButton && (
            <div className="mt-3">
              <button
                onClick={actionButton.onClick}
                className={`text-xs px-3 py-1 rounded ${buttonClass}`}
              >
                {actionButton.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Creates a DetailedErrorNotification from a ValidationResult
 */
export function createNotificationFromValidation(
  validationResult: ValidationResult,
  title: string,
  context?: string,
  errorCode?: string,
  errorDetails?: any,
  onClose?: () => void
) {
  if (!validationResult) return null;
  
  const { valid, message, severity = 'error', suggestions = [] } = validationResult;
  
  if (valid && !message) return null;
  
  return (
    <DetailedErrorNotification
      type={severity}
      title={title}
      message={message || ''}
      suggestions={suggestions}
      errorCode={errorCode}
      errorDetails={errorDetails}
      context={context}
      onClose={onClose}
    />
  );
}