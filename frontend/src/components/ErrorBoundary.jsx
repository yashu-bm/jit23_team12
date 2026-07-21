import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-panel rounded-3xl p-6 text-center text-red-500">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
          <p>Please refresh or try again.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
