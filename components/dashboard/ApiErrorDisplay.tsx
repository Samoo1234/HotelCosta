import React from 'react';
import { AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';

interface ApiErrorDisplayProps {
  error: Error | unknown;
  title?: string;
  message?: string;
  suggestions?: string[];
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Component for displaying API errors in a user-friendly way
 */
export default function ApiErrorDisplay({
  error,
  title = 'Erro de comunicação',
  message,
  suggestions,
  onRetry,
  onDismiss,
  showDetails = false,
  compact = false,
  className = ''
}: ApiErrorDisplayProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = React.useState(false);
  
  // Extract error message
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Use provided message or fallback to error message
  const displayMessage = message || getReadableErrorMessage(errorMessage);
  
  // Use provided suggestions or generate based on error
  const displaySuggestions = suggestions || getDefaultSuggestions(errorMessage);
  
  // If compact mode is requested, show a simpler error
  if (compact) {
    return (
      <div className={`text-red-600 text-sm flex items-center ${className}`}>
        <AlertTriangle className="h-4 w-4 mr-1" />
        <span>{displayMessage}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-2 text-blue-600 hover:text-blue-800 text-xs flex items-center"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Tentar novamente
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className={`p-4 border rounded-lg bg-red-50 border-red-200 ${className}`}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          aria-label="Fechar"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      <div className="flex items-start">
        <div className="mr-3 text-red-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium text-red-800">
            {title}
          </h4>
          
          <p className="text-sm mt-1 text-red-700">
            {displayMessage}
          </p>
          
          {displaySuggestions && displaySuggestions.length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-medium mb-1 text-red-700">
                Sugestões:
              </h5>
              <ul className="list-disc pl-5 text-xs space-y-1 text-red-700">
                {displaySuggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          
          {showDetails && (
            <div className="mt-3">
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="text-xs flex items-center text-red-700"
              >
                <HelpCircle className="h-3 w-3 mr-1" />
                {showTechnicalDetails ? 'Ocultar detalhes técnicos' : 'Mostrar detalhes técnicos'}
              </button>
              
              {showTechnicalDetails && (
                <pre className="mt-2 p-2 rounded text-xs overflow-auto max-h-32 bg-red-100 text-red-800">
                  {errorMessage}
                  {error instanceof Error && error.stack && (
                    <>
                      {'\n\n'}
                      {error.stack}
                    </>
                  )}
                </pre>
              )}
            </div>
          )}
          
          {onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="flex items-center text-xs px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Gets a user-friendly error message based on the error message
 */
function getReadableErrorMessage(errorMessage: string): string {
  // Handle common error messages
  if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return 'A conexão com o servidor expirou. O servidor pode estar sobrecarregado.';
  }
  
  if (errorMessage.includes('NetworkError')) {
    return 'Ocorreu um erro de rede. Verifique sua conexão com a internet.';
  }
  
  if (errorMessage.includes('404')) {
    return 'O recurso solicitado não foi encontrado no servidor.';
  }
  
  if (errorMessage.includes('401')) {
    return 'Sua sessão expirou ou você não tem permissão para acessar este recurso.';
  }
  
  if (errorMessage.includes('403')) {
    return 'Você não tem permissão para acessar este recurso.';
  }
  
  if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
    return 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.';
  }
  
  if (errorMessage === '[object Object]') {
    return 'Ocorreu um erro ao processar sua solicitação.';
  }
  
  // If no specific message is matched, return the original message
  return errorMessage;
}

/**
 * Gets default suggestions based on the error message
 */
function getDefaultSuggestions(errorMessage: string): string[] {
  const baseSuggestions = [
    'Tente atualizar a página e realizar a operação novamente',
    'Verifique sua conexão com a internet',
    'Se o problema persistir, entre em contato com o suporte'
  ];
  
  // Add specific suggestions based on error message
  if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
    return [
      'Verifique sua conexão com a internet',
      'O servidor pode estar temporariamente indisponível',
      'Tente novamente em alguns instantes'
    ];
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return [
      'O servidor pode estar sobrecarregado',
      'Tente novamente em alguns instantes',
      'Se o problema persistir, entre em contato com o suporte'
    ];
  }
  
  if (errorMessage.includes('401')) {
    return [
      'Faça login novamente',
      'Sua sessão pode ter expirado',
      'Verifique se você tem as permissões necessárias'
    ];
  }
  
  if (errorMessage.includes('403')) {
    return [
      'Verifique se você tem as permissões necessárias',
      'Entre em contato com o administrador do sistema',
      'Tente acessar a funcionalidade através do menu principal'
    ];
  }
  
  if (errorMessage.includes('404')) {
    return [
      'Verifique se o endereço está correto',
      'O recurso pode ter sido removido ou movido',
      'Tente atualizar a página e realizar a operação novamente'
    ];
  }
  
  if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
    return [
      'Tente novamente em alguns instantes',
      'O servidor pode estar temporariamente indisponível',
      'Se o problema persistir, entre em contato com o suporte'
    ];
  }
  
  return baseSuggestions;
}