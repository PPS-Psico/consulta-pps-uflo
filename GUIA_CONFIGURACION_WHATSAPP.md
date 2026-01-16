# 🚀 Guía de Configuración: Automatización de WhatsApp & Lanzamientos

Esta guía te llevará paso a paso para configurar el "Robot" que lanzará tus convocatorias automáticamente y enviará los avisos por WhatsApp.

---

## 🟢 FASE 1: Meta Developers (WhatsApp API)

1.  **Consigue tu Número Virtual:**
    *   Usa una App como **Numero eSIM** o **Hushed**.
    *   Compra un número de **USA (+1)** (es más barato y fácil).
    *   *Nota: No uses tu número personal.*

2.  **Crea una App en Meta:**
    *   Ve a [developers.facebook.com](https://developers.facebook.com/).
    *   "My Apps" > "Create App".
    *   Tipo: **"Other"** (o "Business").
    *   Selecciona **WhatsApp** como producto.

3.  **Configura el Número:**
    *   En el panel de WhatsApp > **API Setup**.
    *   Agrega tu número virtual (Add Phone Number).
    *   Te llegará un SMS/Llamada a tu App de número virtual con el código.

4.  **Obtén tus Credenciales:**
    *   En la misma pantalla (API Setup), copia:
        *   **Phone Number ID** (Ej: `100609...`)
        *   **Temporary Access Token** (Para probar) o genera uno permanente en "System Users" (Recomendado para producción).
    *   Para pruebas rápidas, registra tu propio número real en la lista de "Test Numbers" de Meta.

---

## 🟡 FASE 2: Configurar Secretos en Supabase

El "Robot" (Edge Function) necesita las llaves para funcionar. Vamos a guardarlas de forma segura.

1.  Ve a tu proyecto en **Supabase Dashboard**.
2.  En el menú lateral: **Edge Functions** (o directamente en Settings).
3.  Busca la sección **"Secrets"** (Variables de Entorno).
4.  Agrega estas claves (exactamente con este nombre):

| Nombre | Valor (Ejemplo) |
| :--- | :--- |
| `META_PHONE_NUMBER_ID` | `1234567890` (El ID que copiaste de Meta) |
| `META_ACCESS_TOKEN` | `EAAG...` (El token largo que empieza con E) |
| `TARGET_PHONE_NUMBER` | `54911...` (El número al que quieres que lleguen los avisos) |

*(Nota: Si usas un grupo, el ID del grupo es más complejo de sacar, sugiero empezar enviando a tu número personal).*

---

## 🟠 FASE 3: Desplegar la Función (El Robot)

Tienes dos opciones para subir el código que preparé (`supabase/functions/launch-scheduler/index.ts`):

### Opción A: Vía Terminal (Recomendada si tienes Supabase CLI)
Si tienes el CLI instalado en tu PC, corre este comando en la carpeta del proyecto:
```bash
npx supabase functions deploy launch-scheduler --no-verify-jwt
```
*(Nota: `--no-verify-jwt` permite que el Cron Job llame a la función sin ser un usuario logueado).*

### Opción B: Copiar y Pegar (Si no tienes CLI)
No es lo ideal, pero funciona:
1.  Crea la función manualmente en el panel de Supabase si te lo permite (algunos planes requieren CLI).
2.  Copia el contenido de `supabase/functions/launch-scheduler/index.ts`.
3.  Pégalo en el editor online de Supabase.

---

## 🔴 FASE 4: Activar el Cron (El Reloj)

Para que el robot despierte cada hora:

1.  Ve al **SQL Editor** en tu Dashboard de Supabase.
2.  Copia y ejecuta este código SQL:

```sql
-- 1. Habilita la extensión pg_cron (si no está activa)
create extension if not exists pg_cron;

-- 2. Habilita la extensión http (para llamar a la función)
create extension if not exists net;

-- 3. Programa la tarea (Cada hora en punto)
select
  cron.schedule(
    'check-launches-hourly', -- Nombre de la tarea
    '0 * * * *',             -- Cron expression (Minuto 0 de cada hora)
    $$
    select
      net.http_post(
          url:='https://<TU_PROYECTO_REF>.supabase.co/functions/v1/launch-scheduler',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer <TU_ANON_KEY>"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );
```

**IMPORTANTE EN SQL:**
*   Reemplaza `<TU_PROYECTO_REF>` con el ID de tu proyecto (ej: `abcdefghijklm`).
*   Reemplaza `<TU_ANON_KEY>` con tu clave `anon` pública (está en Settings > API).

---

## ✅ ¡Listo!

**Cómo probarlo:**
1.  Ve a la Web > Lanzador.
2.  Crea una convocatoria y marca **"Programar Lanzamiento"**.
3.  Pon una fecha/hora cercana (ej: dentro de 1 hora).
4.  Espera a que pase la hora y revisa si te llega el WhatsApp.
