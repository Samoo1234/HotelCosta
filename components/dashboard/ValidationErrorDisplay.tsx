import React from 'react';
import { ValidationResult } from '@/lib/reservation-validations';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface ValidationErrorDisplayProps {
  validationResult: ValidationResult;
  showIcon?: boolean;
  showSuggestions?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Component for displaying validation errors in a user-friendly way
 */
export default function ValidationErrorDisplay({
  validationResult,
  showIcon = true,
  showSuggestions = true,
  compact = false,
  className = ''
}: ValidationErrorDisplayProps) {
  if (!validationResult || (validationResult.valid && !validationResult.message)) {
    return null;
  }
  
  const { message, severity = 'error', suggestions = [] } = validationResult;
  
  // Configure styles based on severity
  const config = {
    error: {
      containerClass: 'bg-red-50 border-red-200 text-red-700',
      iconClass: 'text-red-600',
      icon: AlertCircle
    },
    warning: {
      containerClass: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      iconClass: 'text-yellow-600',
      icon: AlertTriangle
    },
    info: {
      containerClass: 'bg-blue-50 border-blue-200 text-blue-700',
      iconClass: 'text-blue-600',
      icon: Info
    },
    success: {
      containerClass: 'bg-green-50 border-green-200 text-green-700',
      iconClass: 'text-green-600',
      icon: CheckCircle
    }
  };
  
  const { containerClass, iconClass, icon: Icon } = config[severity];
  
  // If compact mode is requested, show a simpler message
  if (compact) {
    return (
      <div className={`text-sm flex items-center ${className} ${severity === 'error' ? 'text-red-600' : severity === 'warning' ? 'text-yellow-600' : severity === 'info' ? 'text-blue-600' : 'text-green-600'}`}>
        {showIcon && <Icon className="h-4 w-4 mr-1 flex-shrink-0" />}
        <span>{message}</span>
      </div>
    );
  }
  
  return (
    <div className={`p-3 border rounded-lg ${containerClass} ${className}`}>
      <div className="flex items-start">
        {showIcon && (
          <div className={`mr-3 ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        
        <div className="flex-1">
          <p className="text-sm">
            {message}
          </p>
          
          {showSuggestions && suggestions && suggestions.length > 0 && (
            <div className="mt-2">
              <ul className="list-disc pl-5 text-xs space-y-1">
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

/**
 * Component for displaying validation errors inline
 */
export function InlineValidationError({ 
  validationResult,
  className = ''
}: {
  validationResult: ValidationResult;
  className?: string;
}) {
  if (!validationResult || (validationResult.valid && !validationResult.message)) {
    return null;
  }
  
  const { message, severity = 'error' } = validationResult;
  
  const textColorClass = 
    severity === 'error' ? 'text-red-600' : 
    severity === 'warning' ? 'text-yellow-600' : 
    severity === 'info' ? 'text-blue-600' : 
    'text-green-600';
  
  const Icon = 
    severity === 'error' ? AlertCircle : 
    severity === 'warning' ? AlertTriangle : 
    severity === 'info' ? Info : 
    CheckCircle;
  
  return (
    <div className={`text-sm flex items-center ${textColorClass} ${className}`}>
      <Icon className="h-4 w-4 mr-1 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}