# Sistema de Backup Automático - Guía de Configuración

## 📋 Resumen

Se ha implementado un sistema completo de backup automático para Supabase que incluye:

1. **Backup Automático**: Ejecuta backups periódicamente según configuración
2. **Backup Manual**: Permite crear backups bajo demanda desde el panel admin
3. **Restauración**: Restaura la base de datos desde cualquier backup disponible
4. **Historial**: Registra todas las operaciones de backup/restore
5. **Configuración**: Interfaz para ajustar frecuencia, retención y horarios

## 🗄️ Tablas Creadas

### `backup_config`

Almacena la configuración del sistema de backups:

- `enabled`: Activa/desactiva backups automáticos
- `frequency`: Frecuencia (hourly, daily, weekly, monthly)
- `backup_time`: Hora específica para ejecutar (formato HH:MM:SS)
- `retain_count`: Número de backups a mantener
- `include_tables`: Array de tablas a respaldar
- `last_backup_at`: Timestamp del último backup

### `backup_history`

Registro de todas las operaciones:

- `backup_type`: automatic o manual
- `status`: pending, running, completed, failed
- `tables_backed_up`: Tablas incluidas
- `storage_path`: Ruta del archivo en Storage
- `file_size_bytes`: Tamaño del backup
- `record_count`: Cantidad de registros
- `metadata`: Información adicional (en restauraciones)

## ⚡ Edge Functions

### 1. `automated-backup`

**Endpoint**: `POST /functions/v1/automated-backup`

Realiza un backup completo de las tablas configuradas:

- Exporta datos de cada tabla
- Crea archivo JSON con metadata
- Almacena en Supabase Storage (bucket: backups)
- Limpia backups antiguos según retención
- Registra en historial

**Autorización**:

- Token JWT de admin
- O CRON_SECRET para ejecución automática

### 2. `restore-backup`

**Endpoint**: `POST /functions/v1/restore-backup`

Restaura la base de datos desde un backup:

```json
{
  "backup_file_name": "backup_2026-02-12T10-30-00-000Z.json",
  "tables_to_restore": ["estudiantes", "instituciones"], // opcional
  "dry_run": true // Para verificar antes de restaurar
}
```

**Características**:

- Usa UPSERT para evitar duplicados
- Soporta restauración parcial (tablas específicas)
- Modo dry_run para previsualización
- Confirma antes de reemplazar datos

### 3. `list-backups`

**Endpoint**: `GET /functions/v1/list-backups?action={list|config|history}`

**Actions**:

- `list`: Lista backups disponibles + configuración
- `config`: GET/POST configuración
- `history`: Historial de operaciones

## 🎨 Componente UI

### BackupManager

Ubicación: `src/components/admin/BackupManager.tsx`

**Funcionalidades**:

- Dashboard con estado del sistema
- Lista de backups disponibles
- Botón para crear backup manual
- Restauración con confirmación
- Configuración de frecuencia y retención
- Historial de operaciones

## 🔧 Configuración del Cron Job

### Opción 1: Supabase Cron (Requiere suscripción o configuración manual)

Para habilitar backups automáticos, configura un cron job que llame a la Edge Function:

```bash
# Usando una herramienta externa de cron (ej: GitHub Actions, cron-job.org)
# Ejemplo con curl:

curl -X POST \
  https://[PROJECT_REF].supabase.co/functions/v1/automated-backup \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Opción 2: GitHub Actions (Recomendado y Gratuito)

Crea `.github/workflows/backup.yml`:

```yaml
name: Automated Backup

on:
  schedule:
    # Ejecutar todos los días a las 2:00 AM UTC
    - cron: "0 2 * * *"
  workflow_dispatch: # Permite ejecución manual

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Backup
        run: |
          curl -X POST \
            https://${{ secrets.SUPABASE_PROJECT_REF }}.supabase.co/functions/v1/automated-backup \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

### Opción 3: Servicio Externo (cron-job.org)

1. Regístrate en https://cron-job.org
2. Crea un nuevo cron job:
   - URL: `https://[PROJECT_REF].supabase.co/functions/v1/automated-backup`
   - Method: POST
   - Headers: `Authorization: Bearer [CRON_SECRET]`
   - Schedule: Según necesidad (diario recomendado)

## 🔐 Variables de Entorno Necesarias

En tu proyecto Supabase, configura:

```
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]
CRON_SECRET=[UN_SECRET_SEGURO_PARA_CRON]
```

## 📦 Deploy de Edge Functions

```bash
# Deploy todas las funciones
supabase functions deploy automated-backup
supabase functions deploy restore-backup
supabase functions deploy list-backups

# O todas a la vez
supabase functions deploy
```

## 🚀 Integración en el Panel Admin

### 1. Agregar ruta en el router

```typescript
// En tu archivo de rutas admin
{
  path: "backups",
  element: <BackupManager />,
}
```

### 2. Agregar en el menú de navegación

```typescript
{
  icon: "backup",
  label: "Backups",
  path: "/admin/backups",
}
```

## 📊 Flujo de Trabajo

### Crear Backup Manual

1. Ir a Panel Admin > Backups
2. Click en "Crear Backup"
3. Esperar confirmación
4. Backup aparece en la lista

### Restaurar Backup

1. Seleccionar backup de la lista
2. Click en "Restaurar"
3. Verificar información en el diálogo
4. Confirmar restauración
5. Esperar confirmación de éxito

### Configurar Automatización

1. Click en "Configuración"
2. Activar "Backup Automático"
3. Seleccionar frecuencia
4. Ajustar hora (si aplica)
5. Configurar retención
6. Guardar cambios

## ⚠️ Consideraciones Importantes

### Seguridad

- Los backups se almacenan en Storage privado (no público)
- Solo usuarios admin pueden acceder a las funciones
- Las URLs de descarga requieren autenticación
- La restauración requiere confirmación explícita

### Límites

- Tamaño máximo de archivo: 100MB (configurable)
- Retención máxima recomendada: 30 backups
- Frecuencia mínima: cada hora (para evitar sobrecarga)

### Performance

- Los backups se realizan en segundo plano
- No afectan el uso normal de la aplicación
- La restauración puede tomar tiempo según el volumen de datos

## 🐛 Troubleshooting

### Error: "No authentication token available"

- Verificar que el usuario está logueado
- Verificar que el usuario tiene rol admin

### Error: "Failed to upload backup"

- Verificar que el bucket "backups" existe
- Verificar permisos de Storage
- Verificar límite de tamaño de archivo

### Backup automático no se ejecuta

- Verificar configuración de cron job externo
- Verificar CRON_SECRET está configurado
- Revisar logs de ejecución

## 📈 Mejoras Futuras Sugeridas

1. **Compresión**: Comprimir backups para ahorrar espacio
2. **Encriptación**: Encriptar backups sensibles
3. **Notificaciones**: Email/Slack cuando un backup falla
4. **Backup selectivo**: Por tablas específicas
5. **Exportar a cloud**: Subir a S3, GCS, etc.
6. **Validación**: Verificar integridad de backups

## 📞 Soporte

Si encuentras problemas:

1. Revisar logs de Edge Functions
2. Verificar tabla `backup_history` para errores
3. Revisar configuración en `backup_config`
4. Contactar al equipo de desarrollo
