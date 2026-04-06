import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-tactical-card border border-red-500/30 rounded-xl text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">System Error</h2>
          <p className="text-tactical-muted text-sm mb-6 max-w-md">
            Die Komponente ist abgestürzt. Dies kann durch beschädigte lokale Daten oder einen unerwarteten Zustand verursacht worden sein.
          </p>
          <div className="bg-black/50 p-3 rounded text-xs text-red-300/70 font-mono mb-6 max-w-full overflow-auto text-left">
            {this.state.error?.message || 'Unknown Error'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            Komponente neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
