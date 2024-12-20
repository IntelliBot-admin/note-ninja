import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './components/auth/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);