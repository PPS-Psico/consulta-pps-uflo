
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Paths
const indexHtmlPath = path.join(rootDir, 'index.html');
const constantsPath = path.join(rootDir, 'src', 'constants.ts');

console.log('🚀 Preparando archivos para despliegue en GitHub...');

// 1. Modify index.html: Remove Tailwind CDN
try {
    let htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
    
    // Removes the specific CDN line
    if (htmlContent.includes('cdn.tailwindcss.com')) {
        htmlContent = htmlContent.replace(
            /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/g, 
            '<!-- Tailwind CDN removed for production build -->'
        );
        fs.writeFileSync(indexHtmlPath, htmlContent);
        console.log('✅ index.html: CDN de Tailwind eliminado.');
    } else {
        console.log('ℹ️ index.html: CDN no encontrado o ya eliminado.');
    }
} catch (err) {
    console.error('❌ Error modificando index.html:', err);
}

// 2. Modify src/constants.ts: Replace hardcoded keys with import.meta.env
try {
    let tsContent = fs.readFileSync(constantsPath, 'utf-8');
    
    // We use regex to find the lines defining the constants and replace them
    // This allows replacing whatever string value is currently there
    
    const urlRegex = /export const SUPABASE_URL = ".*";/;
    const keyRegex = /export const SUPABASE_ANON_KEY = ".*";/;
    
    let updated = false;

    if (urlRegex.test(tsContent)) {
        tsContent = tsContent.replace(urlRegex, 'export const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || "";');
        updated = true;
    }

    if (keyRegex.test(tsContent)) {
        tsContent = tsContent.replace(keyRegex, 'export const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";');
        updated = true;
    }

    if (updated) {
        fs.writeFileSync(constantsPath, tsContent);
        console.log('✅ src/constants.ts: Credenciales reemplazadas por variables de entorno.');
    } else {
        console.log('ℹ️ src/constants.ts: No se encontraron credenciales hardcodeadas para reemplazar o ya están actualizadas.');
    }

} catch (err) {
    console.error('❌ Error modificando src/constants.ts:', err);
}

console.log('🏁 Preparación completada.');
