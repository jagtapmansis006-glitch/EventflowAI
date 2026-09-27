import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleReturnToLogin = () => {
    localStorage.removeItem('eventflow_auth_token');
    localStorage.removeItem('eventflow_user');
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">
            {this.props.fallbackTitle || 'Component Rendering Exception'}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mb-4 font-mono bg-slate-800/80 p-3 rounded-xl border border-slate-700 break-words text-left">
            {this.state.error?.message || 'An unexpected error occurred while rendering this interface.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Page</span>
            </button>
            <button
              onClick={this.handleReturnToLogin}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors text-slate-300"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Login</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
