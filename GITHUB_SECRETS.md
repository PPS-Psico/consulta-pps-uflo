# GitHub Secrets Configuration

Este proyecto requiere los siguientes GitHub Secrets para funcionar correctamente. Estos secretos no se exponen en el código y se inyectan en tiempo de build.

## Required Secrets

### Supabase Configuration

- `VITE_SUPABASE_URL` - URL de tu proyecto Supabase (ej: https://xxxxxxxxx.supabase.co)
- `VITE_SUPABASE_ANON_KEY` - Clave anónima pública de Supabase (obtenida desde Settings > API)
- `SUPABASE_PROJECT_REF` - Referencia del proyecto Supabase (ej: qxnxtnhtbpsgzprqtrjl)

### Backup System

- `CRON_SECRET` - Secret para autorizar ejecución automática de backups (puede ser cualquier string seguro)
  - Se usa en el GitHub Action para ejecutar backups automáticos
  - Debe coincidir con la variable de entorno CRON_SECRET en Supabase Edge Functions

### External Services

- `VITE_VAPID_PUBLIC_KEY` - Clave pública VAPID para notificaciones push
- `VITE_GA4_MEASUREMENT_ID` - Measurement ID de Google Analytics 4 (ej: G-XXXXXXXXXX)

**Importante:** `VITE_GEMINI_API_KEY` ya NO se usa en el frontend por seguridad. La función de IA ahora usa la edge function `generate-content` con su propia clave protegida en Supabase.

### Optional Secrets

- `VITE_SENTRY_DSN` - DSN de Sentry para monitoreo de errores (opcional)
- `VITE_APP_VERSION` - Versión de la aplicación (default: 1.0.0)
- `VITE_ENABLE_MONITORING_IN_DEV` - Habilitar monitoreo en desarrollo (true/false)

## How to Add Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each secret with its name and value

## Supabase Edge Functions Environment Variables

Para las edge functions en Supabase, necesitas configurar variables de entorno adicionales:

1. Ve a tu proyecto Supabase
2. Navega a **Edge Functions** > **Settings**
3. Agrega las siguientes variables:
   - `GEMINI_API_KEY` - Clave de API de Google Gemini para la edge function generate-content
   - `VAPID_PRIVATE_KEY` - Clave privada VAPID para la edge function send-push

## Edge Functions Deployment

El proyecto incluye las siguientes edge functions:

### Core Functions

- `health-check` - Verifica el estado de los servicios
- `generate-content` - Genera contenido con Gemini AI
- `send-push` - Envía notificaciones push
- `launch-scheduler` - Programador de lanzamientos

### Backup System

- `automated-backup` - Crea backups automáticos de la base de datos
- `restore-backup` - Restaura la base de datos desde un backup
- `list-backups` - Lista backups disponibles y gestiona configuración

Para deployar edge functions:

```bash
# Core functions
supabase functions deploy health-check
supabase functions deploy generate-content
supabase functions deploy send-push
supabase functions deploy launch-scheduler

# Backup functions
supabase functions deploy automated-backup
supabase functions deploy restore-backup
supabase functions deploy list-backups
```

## Security Notes

- Nunca commitees archivos .env con claves reales
- Las variables VITE\_\* se exponen en el cliente (browser) por diseño de Vite
- Usa Supabase Edge Functions para operaciones sensibles que requieran claves privadas
- Revisa regularmente las RLS (Row Level Security) policies en Supabase
- Rotar claves regularmente por buenas prácticas de seguridad
