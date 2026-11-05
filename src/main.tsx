import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './theme.css';

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  state = {
    hasError: false,
    errorMessage: ''
  };

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error.message || 'Unknown runtime error'
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Word Bites runtime error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          fontFamily: 'system-ui',
          background: '#f4ead9',
          color: '#342c23',
          textAlign: 'center'
        }}>
          <div>
            <div style={{fontSize: 56}}>🍪</div>
            <h1>Word Bites Runtime Error</h1>
            <p>{this.state.errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
            >
              Reload Word Bites
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Word Bites offline support could not be registered', error);
    });
  });
}

const root=document.getElementById('root');
if(root){
  createRoot(root).render(
    <StrictMode>
      <AppErrorBoundary><App /></AppErrorBoundary>
    </StrictMode>
  );
}
