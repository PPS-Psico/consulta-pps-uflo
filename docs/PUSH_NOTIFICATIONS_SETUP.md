# 🔔 Configuración de Notificaciones Push (Web Push Nativo)

Este sistema utiliza **Web Push API nativo** (RFC 8030) sin dependencias de Firebase ni servicios externos.

## 📋 Requisitos

1. **VAPID Keys**: Un par de claves públicas/privadas para autenticación
2. **Service Worker**: Ya configurado en `public/sw.js`
3. **HTTPS**: Obligatorio para Web Push (o localhost en desarrollo)

---

## 🔑 Paso 1: Generar Claves VAPID

Ejecuta este comando en la carpeta del proyecto:

```bash
npx web-push generate-vapid-keys
```

Esto generará output como:

```
=======================================
Public Key:
BM9IqgQCW-haGEL2LZbdhBCXPUctP2PGvU07XZSN0jGpBTFLhkx...

Private Key:
UQ8qg8kzyCO3MhAubQTysnlPv8WF3MpqaViAg...
=======================================
```

**¡IMPORTANTE!** Guarda ambas claves en un lugar seguro.

---

## 📝 Paso 2: Configurar Variables de Entorno

### Frontend (.env)

Agrega la clave **pública** a tu archivo `.env`:

```env
VITE_VAPID_PUBLIC_KEY=BM9IqgQCW-haGEL2LZbdhBCXPUctP2PGvU07XZSN0jGpBTFLhkx...
```

### Supabase Edge Function Secrets

En el dashboard de Supabase, ve a:
**Project Settings → Edge Functions → Secrets**

Y agrega estos secretos:

| Nombre              | Valor                                 |
| ------------------- | ------------------------------------- |
| `VAPID_PUBLIC_KEY`  | Tu clave pública VAPID                |
| `VAPID_PRIVATE_KEY` | Tu clave privada VAPID                |
| `VAPID_SUBJECT`     | `mailto:pps@uflo.edu.ar` (o tu email) |

---

## 📦 Paso 3: Desplegar Edge Function

Despliega la Edge Function actualizada:

```bash
npx supabase functions deploy send-push --project-ref gvvhcjbntrdphxrvypnb
```

---

## 🗄️ Paso 4: Ejecutar Migración de Base de Datos

La tabla `push_subscriptions` debe existir. Ejecuta la migración:

```sql
-- Verificar si existe
SELECT * FROM push_subscriptions LIMIT 1;

-- Si no existe, ejecutar el SQL de:
-- supabase/migrations/20260125_create_push_subscriptions.sql
```

O desde el CLI de Supabase:

```bash
npx supabase db push
```

---

## ✅ Verificación

1. **En el navegador**: Abre DevTools → Application → Service Workers
   - Debe aparecer `sw.js` registrado

2. **En el perfil del estudiante**: Debe verse el toggle de notificaciones

3. **Test manual**: Desde la consola del navegador:

   ```javascript
   // Verificar soporte
   console.log("Push supported:", "PushManager" in window);

   // Ver estado de suscripción
   navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then(console.log);
   ```

---

## 🔧 Cómo Funciona

### Flujo de Suscripción

1. Estudiante activa el toggle en "Mi Perfil"
2. El navegador solicita permiso de notificaciones
3. Se genera una suscripción (endpoint + claves)
4. Se guarda en la tabla `push_subscriptions` de Supabase

### Flujo de Envío (cuando se lanza una convocatoria)

1. El admin crea/activa un lanzamiento
2. Se llama `notificationService.notifyNewLaunch()`
3. La Edge Function `send-push` obtiene todas las suscripciones
4. Cifra el mensaje con Web Push estándar y lo envía
5. Los navegadores reciben el push y muestran la notificación

---

## 📁 Archivos Relevantes

| Archivo                                  | Descripción                             |
| ---------------------------------------- | --------------------------------------- |
| `src/lib/pushSubscription.ts`            | Utilidades de suscripción/desuscripción |
| `src/contexts/NotificationContext.tsx`   | Contexto con estado de push             |
| `src/components/student/ProfileView.tsx` | Toggle de activación                    |
| `src/services/notificationService.ts`    | Servicio para enviar pushes             |
| `supabase/functions/send-push/index.ts`  | Edge Function de envío                  |
| `public/sw.js`                           | Service Worker con handlers de push     |

---

## ⚠️ Notas Importantes

- Las notificaciones push **solo funcionan con HTTPS** (o localhost)
- En iOS Safari, Web Push solo está disponible desde iOS 16.4+
- Las suscripciones inválidas (expiradas) se limpian automáticamente
- El usuario puede desactivar las notificaciones en cualquier momento

---

## 🐛 Troubleshooting

### "No se pudo activar notificaciones"

- Verifica que `VITE_VAPID_PUBLIC_KEY` esté configurado
- Asegúrate de que el Service Worker esté registrado
- Revisa que tengas HTTPS (o localhost)

### Las notificaciones no llegan

- Verifica que `VAPID_PRIVATE_KEY` esté en Supabase Secrets
- Revisa los logs de la Edge Function en Supabase Dashboard
- Comprueba que haya suscripciones en `push_subscriptions`

### Error "Subscription has unsubscribed or expired"

- Es normal, el sistema limpia automáticamente suscripciones inválidas
- El usuario debe volver a activar las notificaciones
