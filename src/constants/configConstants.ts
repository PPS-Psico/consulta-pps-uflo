// --- Environment Configuration ---
// NOTA: Estas credenciales están hardcodeadas para que el entorno de desarrollo y 'vite preview' funcionen.
// El script "npm run prep-github" buscará y reemplazará estos valores exactos antes del despliegue.

// Helper to get env values safely in both Vite and Jest
const getEnv = (key: string, defaultValue: string = ""): string => {
  // Check for both process.env and import.meta.env
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key] || defaultValue;
  }
  // For Vite, use import.meta.env
  return (import.meta.env as any)[key] || defaultValue;
};

export const SUPABASE_URL = getEnv("VITE_SUPABASE_URL", "");
export const SUPABASE_ANON_KEY = getEnv("VITE_SUPABASE_ANON_KEY", "");

export const GEMINI_API_KEY = getEnv("VITE_GEMINI_API_KEY", "") || getEnv("API_KEY", "");
