import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can also log the error to an error reporting service
    // logErrorToMyService(error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary" style={{ padding: '20px', backgroundColor: '#fff8f8', border: '1px solid #d32f2f', borderRadius: '8px', margin: '20px' }}>
          <h2 style={{ color: '#d32f2f' }}>アプリケーションエラーが発生しました</h2>
          <p>ご迷惑をおかけし申し訳ありません。ページをリロードしてみてください。</p>
          <details style={{ whiteSpace: 'pre-wrap', background: '#fefefe', padding: '10px', marginTop: '10px' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {/* [修正] errorInfo が null の場合を考慮し、オプショナルチェーン (?.) を追加しました
            */}
            {this.state.errorInfo?.componentStack}
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '15px', padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#d32f2f', color: 'white', cursor: 'pointer' }}
          >
            ページをリロード
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;