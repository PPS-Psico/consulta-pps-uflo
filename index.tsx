
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App';
import { AuthProvider } from './src/contexts/AuthContext';
// @ts-ignore
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import './src/index.css';

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);

// Service Worker Registration
// Only register in production to avoid origin mismatch errors in preview environments
// Safe check for import.meta.env to prevent runtime errors if env is not fully polyfilled
const meta = import.meta as any;
if (meta.env && meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // In this environment, an absolute path based on the app's base path is required
    // to avoid cross-origin errors during service worker registration.
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}