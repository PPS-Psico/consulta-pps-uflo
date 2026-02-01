// --- Environment Configuration ---
// NOTA: Estas credenciales están hardcodeadas para que el entorno de desarrollo y 'vite preview' funcionen.
// El script "npm run prep-github" buscará y reemplazará estos valores exactos antes del despliegue.

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

// --- Google Gemini AI ---
export const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || "";
