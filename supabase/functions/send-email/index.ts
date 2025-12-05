import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createTransport } from "npm:nodemailer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});