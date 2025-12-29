
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
// @ts-ignore
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import './index.css';

// --- REACT RESILIENCE PATCH (GOOGLE TRANSLATE FIX) ---
// Intercepta errores del DOM causados por traductores automáticos
// evitando que la aplicación se rompa (pantalla blanca/error removeChild).
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (console) console.warn('[React Resilience] Suppressing removeChild error from external mutation.');
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) console.warn('[React Resilience] Suppressing insertBefore error from external mutation.');
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

// Deshabilitar traducción automática preventivamente en el body
document.body.classList.add('notranslate');
document.body.setAttribute('translate', 'no');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("No se encontró el elemento root");
}

// --- SOLUCIÓN ESTRUCTURAL: LIMPIEZA DE CONTENEDOR ---
// Esto previene el problema de "pantalla duplicada" en entornos de desarrollo/preview
// asegurando que el contenedor esté vacío antes de que React monte la aplicación.
rootElement.innerHTML = '';

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
const meta = import.meta as any;
if (meta.env && meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registro del SW con ruta relativa para soportar GitHub Pages (base: ./)
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}
