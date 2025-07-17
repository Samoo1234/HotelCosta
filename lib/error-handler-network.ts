/**
 * Interface for network error handling options
 */
interface NetworkErrorHandlerOptions {
  error: Error | unknown;
  endpoint?: string;
  operation?: string;
  context?: string;
  fallbackMessage?: string;
  showToast?: boolean;
  retryable?: boolean;
  onRetry?: () => void;
}

/**
 * Handles network errors with appropriate error messages and fallbacks
 * @param options Network error handling options
 * @returns Error information object
 */
export function handleNetworkError({
  error,
  endpoint,
  operation,
  context = 'api',
  fallbackMessage = 'Ocorreu um erro de comunicação com o servidor',
  showToast = true,
  retryable = true,
  onRetry
}: NetworkErrorHandlerOptions) {
  // Extract error details
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStatus = getErrorStatusFromError(error);
  
  // Create error details object
  const errorDetails = {
    endpoint,
    operation,
    status: errorStatus,
    originalError: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error
  };
  
  // Generate error code
  const errorCode = `NET-${errorStatus || 'ERR'}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  
  // Log the error
  console.error(`Network Error in ${context}:`, {
    error_code: errorCode,
    endpoint,
    operation,
    status: errorStatus,
    details: errorDetails
  });
  
  // Determine appropriate message and suggestions based on error status
  const { title, message, suggestions } = getNetworkErrorInfo(errorStatus, operation, fallbackMessage);
  
  // Return error information
  return {
    errorCode,
    message,
    title,
    suggestions,
    details: errorDetails,
    status: errorStatus
  };
}

/**
 * Extracts HTTP status code from error object
 * @param error Error object
 * @returns HTTP status code or undefined
 */
function getErrorStatusFromError(error: Error | unknown): number | undefined {
  if (!error) return undefined;
  
  // Check for fetch response error
  if (typeof error === 'object' && error !== null) {
    // @ts-ignore - Check for status property
    if (typeof error.status === 'number') {
      // @ts-ignore
      return error.status;
    }
    
    // @ts-ignore - Check for response property (fetch error)
    if (error.response && typeof error.response.status === 'number') {
      // @ts-ignore
      return error.response.status;
    }
    
    // Check for statusCode property
    // @ts-ignore
    if (typeof error.statusCode === 'number') {
      // @ts-ignore
      return error.statusCode;
    }
  }
  
  // Try to extract status code from error message
  if (error instanceof Error) {
    const statusMatch = error.message.match(/(\b[45]\d{2}\b)/);
    if (statusMatch) {
      return parseInt(statusMatch[1], 10);
    }
  }
  
  return undefined;
}

/**
 * Gets appropriate error information based on HTTP status code
 * @param status HTTP status code
 * @param operation Operation being performed
 * @param fallbackMessage Fallback message if no specific message is available
 * @returns Error information object
 */
function getNetworkErrorInfo(
  status: number | undefined,
  operation?: string,
  fallbackMessage?: string
): { title: string; message: string; suggestions: string[] } {
  const operationText = operation ? ` ao ${operation}` : '';
  
  switch (status) {
    case 400:
      return {
        title: 'Requisição inválida',
        message: `O servidor não conseguiu processar a requisição${operationText} devido a um erro nos dados enviados.`,
        suggestions: [
          'Verifique se todos os campos obrigatórios foram preenchidos corretamente',
          'Tente atualizar a página e realizar a operação novamente',
          'Se o problema persistir, entre em contato com o suporte'
        ]
      };
      
    case 401:
      return {
        title: 'Não autorizado',
        message: 'Sua sessão expirou ou você não tem permissão para realizar esta operação.',
        suggestions: [
          'Faça login novamente',
          'Verifique se você tem as permissões necessárias',
          'Entre em contato com o administrador do sistema'
        ]
      };
      
    case 403:
      return {
        title: 'Acesso negado',
        message: 'Você não tem permissão para realizar esta operação.',
        suggestions: [
          'Verifique se você tem as permissões necessárias',
          'Entre em contato com o administrador do sistema',
          'Tente acessar a funcionalidade através do menu principal'
        ]
      };
      
    case 404:
      return {
        title: 'Recurso não encontrado',
        message: `O recurso solicitado${operationText} não foi encontrado no servidor.`,
        suggestions: [
          'Verifique se o endereço está correto',
          'O recurso pode ter sido removido ou movido',
          'Tente atualizar a página e realizar a operação novamente'
        ]
      };
      
    case 409:
      return {
        title: 'Conflito de dados',
        message: `Ocorreu um conflito${operationText}. Os dados podem ter sido alterados por outro usuário.`,
        suggestions: [
          'Atualize a página para obter os dados mais recentes',
          'Verifique se outro usuário está editando os mesmos dados',
          'Tente realizar a operação novamente'
        ]
      };
      
    case 422:
      return {
        title: 'Dados inválidos',
        message: `Os dados enviados${operationText} não são válidos.`,
        suggestions: [
          'Verifique se todos os campos estão preenchidos corretamente',
          'Corrija os erros indicados e tente novamente',
          'Se o problema persistir, entre em contato com o suporte'
        ]
      };
      
    case 429:
      return {
        title: 'Muitas requisições',
        message: 'Você realizou muitas requisições em um curto período de tempo.',
        suggestions: [
          'Aguarde alguns instantes antes de tentar novamente',
          'Evite realizar muitas operações simultâneas',
          'Se o problema persistir, entre em contato com o suporte'
        ]
      };
      
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        title: 'Erro no servidor',
        message: `Ocorreu um erro no servidor${operationText}.`,
        suggestions: [
          'Tente novamente em alguns instantes',
          'O servidor pode estar temporariamente indisponível',
          'Se o problema persistir, entre em contato com o suporte'
        ]
      };
      
    default:
      return {
        title: 'Erro de comunicação',
        message: fallbackMessage || `Ocorreu um erro de comunicação com o servidor${operationText}.`,
        suggestions: [
          'Verifique sua conexão com a internet',
          'Tente atualizar a página e realizar a operação novamente',
          'Se o problema persistir, entre em contato com o suporte'
        ]
      };
  }
}

/**
 * Handles errors related to system logs
 * @param error Error object
 * @param fallbackLogging Function to use as fallback logging
 */
export function handleLoggingError(
  error: Error | unknown,
  fallbackLogging?: (message: string, details?: any) => void
) {
  // Extract error details
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStatus = getErrorStatusFromError(error);
  
  // Create error details
  const errorDetails = {
    status: errorStatus,
    originalError: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error
  };
  
  // Use fallback logging if provided
  if (fallbackLogging) {
    fallbackLogging('Erro ao salvar log no servidor', {
      error: errorMessage,
      status: errorStatus,
      timestamp: new Date().toISOString()
    });
  } else {
    // Log to console as fallback
    console.error('Error creating log entry:', errorDetails);
  }
}

/**
 * Creates a fallback logging function that logs to localStorage
 * @returns Fallback logging function
 */
export function createFallbackLogger() {
  return (message: string, details?: any) => {
    try {
      // Get existing logs from localStorage
      const existingLogs = localStorage.getItem('fallback_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      // Add new log entry
      logs.push({
        timestamp: new Date().toISOString(),
        message,
        details
      });
      
      // Keep only the last 100 logs
      const trimmedLogs = logs.slice(-100);
      
      // Save back to localStorage
      localStorage.setItem('fallback_logs', JSON.stringify(trimmedLogs));
    } catch (e) {
      // If localStorage fails, just log to console
      console.error('Fallback logging failed:', e);
      console.error('Original log:', message, details);
    }
  };
}