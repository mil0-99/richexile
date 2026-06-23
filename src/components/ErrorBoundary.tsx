import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#0c0a09', color: '#f59e0b', fontFamily: 'monospace', padding: '2rem', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Rich Exile — Render Error</h1>
          <pre style={{ background: '#1c1917', padding: '1rem', borderRadius: '8px', overflow: 'auto', color: '#ef4444', fontSize: '0.85rem' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
