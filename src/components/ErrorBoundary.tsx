import { Component } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('PWA Error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-surface text-white p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <pre className="text-sm text-red-400 bg-surface-light p-4 rounded-xl max-w-full overflow-auto mb-4">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            className="px-6 py-3 bg-accent text-white font-bold rounded-xl"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
