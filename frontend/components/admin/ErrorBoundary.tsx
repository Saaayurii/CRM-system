'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Ошибка отображения данных</p>
            <p className="text-xs text-red-500/70">{this.state.error?.message || 'Неизвестная ошибка'}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 btn-xs bg-red-500 hover:bg-red-600 text-white"
            >
              Попробовать снова
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
