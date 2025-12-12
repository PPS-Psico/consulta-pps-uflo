<<<<<<< HEAD

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { resolve, dirname } from 'node:path'
=======
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { dirname } from 'node:path'
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
<<<<<<< HEAD
  const env = loadEnv(mode, (process as any).cwd(), '');
=======
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '')
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47

  return {
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      // Esta opción le dice a Vite que se asegure de usar una única copia de estas librerías
      dedupe: ['react', 'react-dom', 'react-router-dom'],
    },
    define: {
<<<<<<< HEAD
=======
      // Expose the API_KEY to the client-side code safely
      // Prioritize VITE_GEMINI_API_KEY if available (from GitHub Secrets/Env), otherwise fallback to API_KEY
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.API_KEY),
    },
    build: {
      rollupOptions: {
        // No external dependencies needed; Vite will bundle everything.
      },
    },
    // Optimize deps to ensure they are pre-bundled correctly
    optimizeDeps: {
<<<<<<< HEAD
      include: ['react', 'react-dom', 'react-router-dom']
    }
  }
})
=======
      include: ['react', 'react-dom', 'react-router-dom'],
    },
  }
})
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
