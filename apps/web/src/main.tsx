import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

const queryClient = new QueryClient();

// Preserve auto-create intent across navigation for E2E.
if (typeof window !== 'undefined' && window.location.search.includes('autoCreateCharacter=1')) {
  try {
    localStorage.setItem('autoCreateCharacter', '1');
  } catch (err) {
    // ignore localStorage errors in test environments
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
