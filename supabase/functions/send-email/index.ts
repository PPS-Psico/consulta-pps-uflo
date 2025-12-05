import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
<<<<<<< HEAD
import { createTransport } from "npm:nodemailer";
=======
import { Resend } from "npm:resend";
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
<<<<<<< HEAD
  // Handle CORS preflight request
=======
  // Manejo de CORS para que el frontend pueda llamar a la función
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
<<<<<<< HEAD
    const SMTP_EMAIL = Deno.env.get('SMTP_EMAIL');
    const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD');

    if (!SMTP_EMAIL || !SMTP_PASSWORD) {
      throw new Error('Faltan las credenciales SMTP en las variables de entorno.');
    }

    // Create Nodemailer transporter
    const transporter = createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
      },
    });

    const { to, subject, text, name } = await req.json();

    // Send email
    const info = await transporter.sendMail({
      from: `"Mi Panel Académico" <${SMTP_EMAIL}>`,
      to: to,
      subject: subject,
      html: `<p>Hola ${name || ''},</p><p style="white-space: pre-line;">${text}</p><br/><p><small>Este es un mensaje automático del sistema de gestión de PPS.</small></p>`,
    });

    console.log("Email sent: %s", info.messageId);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error sending email:", error);
=======
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
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});