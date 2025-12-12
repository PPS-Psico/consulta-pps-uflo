<<<<<<< HEAD

=======
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
<<<<<<< HEAD
import { AuthProvider } from './contexts/AuthContext';
// @ts-ignore
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
=======
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient();
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("No se encontró el elemento root");
}

const root = createRoot(rootElement);
<<<<<<< HEAD

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <App />
        </AuthProvider>
=======
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);

// Service Worker Registration
const meta = import.meta as any;
if (meta.env && meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
<<<<<<< HEAD
}
=======
}
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
