import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { handleNetworkError } from '@/lib/error-handler-network';

interface NetworkErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: string;
}

interface NetworkErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isOffline: boolean;
}

/**
 * Component that catches network errors in its children and displays
 * a fallback UI with retry options
 */
export default class NetworkErrorBoundary extends Component<NetworkErrorBoundaryProps, NetworkErrorBoundaryState> {
  constructor(props: NetworkErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isOffline: false
    };
  }

  static getDerivedStateFromError(error: Error): NetworkErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      isOffline: !navigator.onLine
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our error handling system
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Handle network error with our error handler
    if (this.isNetworkError(error)) {
      handleNetworkError({
        error,
        context: this.props.context || 'component',
        showToast: true
      });
    }
  }

  componentDidMount(): void {
    // Add event listeners for online/offline status
    window.addEventListener('online', this.handleOnlineStatus);
    window.addEventListener('offline', this.handleOfflineStatus);
  }

  componentWillUnmount(): void {
    // Remove event listeners
    window.removeEventListener('online', this.handleOnlineStatus);
    window.removeEventListener('offline', this.handleOfflineStatus);
  }

  handleOnlineStatus = (): void => {
    this.setState({ isOffline: false });
    // If we were showing an error due to being offline, try to recover
    if (this.state.hasError && this.state.isOffline) {
      this.resetError();
    }
  };

  handleOfflineStatus = (): void => {
    this.setState({ isOffline: true });
  };

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  isNetworkError(error: Error): boolean {
    // Check if the error is a network error
    return (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('Network request failed') ||
      !navigator.onLine
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error!, this.resetError);
        }
        return this.props.fallback;
      }

      // Otherwise, use our default fallback UI
      return (
        <div className="p-4 border rounded-lg bg-red-50 border-red-200">
          <div className="flex items-start">
            <div className="mr-3 text-red-600">
              {this.state.isOffline ? (
                <WifiOff className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            
            <div className="flex-1">
              <h4 className="font-medium text-red-800">
                {this.state.isOffline
                  ? 'Sem conexão com a internet'
                  : 'Erro de comunicação com o servidor'}
              </h4>
              
              <p className="text-sm mt-1 text-red-700">
                {this.state.isOffline
                  ? 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'
                  : 'Ocorreu um erro ao comunicar com o servidor. Tente novamente em alguns instantes.'}
              </p>
              
              <div className="mt-3">
                <h5 className="text-xs font-medium mb-1 text-red-700">
                  Sugestões:
                </h5>
                <ul className="list-disc pl-5 text-xs space-y-1 text-red-700">
                  <li>Verifique sua conexão com a internet</li>
                  <li>Atualize a página e tente novamente</li>
                  <li>Se o problema persistir, entre em contato com o suporte</li>
                </ul>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={this.resetError}
                  className="flex items-center text-xs px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

/**
 * Component that displays a network status indicator
 */
export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-600 text-white px-3 py-2 rounded-full flex items-center shadow-lg">
      <WifiOff className="h-4 w-4 mr-2" />
      <span className="text-sm">Sem conexão</span>
    </div>
  );
}