// --- Environment Configuration ---
// TEMPORAL: Hardcodeo las credenciales para producción
// TODO: Resolver problema con variables de entorno en GitHub Actions

const SUPABASE_URL_VALUE = "https://qxnxtnhtbpsgzprqtrjl.supabase.co";
const SUPABASE_ANON_KEY_VALUE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4bnh0bmh0YnBzZ3pwcnF0cmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjIzNDEsImV4cCI6MjA3OTAzODM0MX0.Lwj2kZPjYaM6M7VbUX48hSnCh3N2YB6iMJtdhFP9brU";

// Debug logging
console.log("=== SUPABASE CREDENTIALS DEBUG ===");
console.log("Full SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY_VALUE);
console.log("First 50 chars:", SUPABASE_ANON_KEY_VALUE.substring(0, 50));
console.log("================================");

export const SUPABASE_URL = SUPABASE_URL_VALUE;
export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_VALUE;
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";
