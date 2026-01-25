import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// -- CONFIGURATION --
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_EMAIL = 'mailto:admin@uflo.edu.ar';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🔧 Starting send-push function...');

// Import web-push from npm with compatibility fix
let webpush;
try {
    console.log('Attempting to import web-push from npm...');
    const module = await import('https://esm.sh/web-push@3.6.7?bundle=true&no-check=true');
    webpush = module.default;
    console.log('✅ web-push imported. Export keys:', Object.keys(module));
    console.log('Webpush type:', typeof webpush);
    console.log('Webpush methods:', Object.keys(webpush || {}));
} catch (err) {
    console.error('❌ Failed to import web-push:', err);
}

// Initialize Web Push
if (webpush && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    try {
        webpush.setVapidDetails(
            VAPID_EMAIL,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
        );
        console.log('✅ VAPID configured');
    } catch (err) {
        console.error('❌ Failed to set VAPID:', err);
    }
} else {
    console.warn("⚠️ VAPID Keys or web-push not available");
}

Deno.serve(async (req) => {
    console.log('📥 Request received:', req.method);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { title, message, url, user_id } = await req.json();

        if (!title || !message) {
            throw new Error('Title and message are required.');
        }

        console.log(`[Push] Sending: "${title}" to ${user_id ? user_id : 'ALL'}`);

        let query = supabase.from('push_subscriptions').select('*');
        if (user_id) {
            query = query.eq('user_id', user_id);
        }

        const { data: subscriptions, error: dbError } = await query;

        if (dbError) throw dbError;
        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ message: 'No subscriptions found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const payload = JSON.stringify({ title, message, url: url || '/' });
        const results = [];

        console.log(`[Push] Sending to ${subscriptions.length} subscriptions`);
        console.log(`[Push] webpush.sendNotification type:`, typeof webpush?.sendNotification);

        // Send notifications
        const promises = subscriptions.map(async (sub) => {
            try {
                const pushConfig = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                };

                console.log(`[Push] Attempting to send to ${sub.id}`);
                await webpush.sendNotification(pushConfig, payload);
                return { id: sub.id, success: true };
            } catch (err) {
                console.error(`[Push] Error sending to ${sub.id}:`, err);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`[Push] Cleaning up expired subscription ${sub.id}`);
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                    return { id: sub.id, success: false, error: 'Expired', cleaned: true };
                }
                return { id: sub.id, success: false, error: err.message || String(err) };
            }
        });

        const sentResults = await Promise.all(promises);
        const successCount = sentResults.filter(r => r.success).length;

        return new Response(JSON.stringify({
            success: true,
            sent: successCount,
            total: subscriptions.length,
            details: sentResults
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("[Push] Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
});
