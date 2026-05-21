import React, { ErrorInfo, ReactNode, Component } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-red-50 rounded-xl">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Oops! Algo deu errado.</h2>
          <p className="text-red-600 mb-6 max-w-md">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;