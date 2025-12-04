import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de CORS para que el frontend pueda llamar a la función
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Obtenemos la API Key desde las variables de entorno seguras de Supabase
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
        throw new Error("Falta configuración de RESEND_API_KEY");
    }

    const resend = new Resend(RESEND_API_KEY);
    const { to, subject, text, name } = await req.json();

    // Enviamos el correo
    const { data, error } = await resend.emails.send({
      from: 'UFLO PPS <onboarding@resend.dev>', // Si no tienes dominio propio verificado en Resend, usa este.
      to: [to],
      subject: subject,
      html: `<p>Hola ${name || ''},</p><p style="white-space: pre-line;">${text}</p><br/><p><small>Este es un mensaje automático de Mi Panel Académico.</small></p>`,
    });

    if (error) {
      console.error("Error Resend:", error);
      return new Response(JSON.stringify({ error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});