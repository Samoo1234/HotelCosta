import { toast } from 'react-hot-toast';
import { ValidationResult } from './ReservationActionErrorHandler';
import DetailedErrorNotification, { NotificationType } from './DetailedErrorNotification';

interface DetailedToastOptions {
  type: NotificationType;
  title: string;
  message: string;
  suggestions?: string[];
  errorCode?: string;
  errorDetails?: any;
  context?: string;
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  showHelp?: boolean;
  helpText?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Shows a detailed toast notification with title, message, and suggestions
 */
export function showDetailedToast({
  type = 'info',
  title,
  message,
  suggestions = [],
  errorCode,
  errorDetails,
  context,
  duration = 5000,
  position = 'bottom-right',
  showHelp,
  helpText,
  actionButton
}: DetailedToastOptions) {
  // Log error to system logs if it's an error type
  if (type === 'error' && context) {
    console.error(`Error in ${context}:`, {
      message,
      error_code: errorCode,
      title,
      details: errorDetails
    });
  }

  return toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full shadow-lg rounded-lg pointer-events-auto`}
      >
        <DetailedErrorNotification
          type={type}
          title={title}
          message={message}
          suggestions={suggestions}
          errorCode={errorCode}
          errorDetails={errorDetails}
          context={context}
          onClose={() => toast.dismiss(t.id)}
          dismissible={true}
          showHelp={showHelp}
          helpText={helpText}
          actionButton={actionButton ? {
            ...actionButton,
            onClick: () => {
              actionButton.onClick();
              toast.dismiss(t.id);
            }
          } : undefined}
        />
      </div>
    ),
    {
      duration,
      position
    }
  );
}

/**
 * Shows an error toast with detailed information
 */
export function showErrorToast(
  title: string, 
  message: string, 
  suggestions?: string[], 
  errorCode?: string, 
  errorDetails?: any,
  context?: string
) {
  return showDetailedToast({
    type: 'error',
    title,
    message,
    suggestions,
    errorCode,
    errorDetails,
    context,
    duration: 8000 // Longer duration for errors
  });
}

/**
 * Shows a warning toast with detailed information
 */
export function showWarningToast(
  title: string, 
  message: string, 
  suggestions?: string[], 
  context?: string
) {
  return showDetailedToast({
    type: 'warning',
    title,
    message,
    suggestions,
    context,
    duration: 6000
  });
}

/**
 * Shows an info toast with detailed information
 */
export function showInfoToast(
  title: string, 
  message: string, 
  suggestions?: string[]
) {
  return showDetailedToast({
    type: 'info',
    title,
    message,
    suggestions,
    duration: 5000
  });
}

/**
 * Shows a success toast with detailed information
 */
export function showSuccessToast(
  title: string, 
  message: string, 
  suggestions?: string[]
) {
  return showDetailedToast({
    type: 'success',
    title,
    message,
    suggestions,
    duration: 5000
  });
}

/**
 * Shows a toast notification from a validation result
 */
export function showValidationResultToast(
  validationResult: ValidationResult,
  title: string,
  context?: string,
  errorCode?: string,
  errorDetails?: any,
  actionButton?: {
    label: string;
    onClick: () => void;
  }
) {
  if (!validationResult) return null;
  
  const { valid, message, severity = 'error', suggestions = [] } = validationResult;
  
  if (valid && !message) return null;
  
  switch (severity) {
    case 'error':
      return showErrorToast(title, message || '', suggestions, errorCode, errorDetails, context);
    case 'warning':
      return showWarningToast(title, message || '', suggestions, context);
    case 'info':
      return showInfoToast(title, message || '', suggestions);
    default:
      return showDetailedToast({
        type: severity,
        title,
        message: message || '',
        suggestions,
        errorCode,
        errorDetails,
        context,
        actionButton
      });
  }
}