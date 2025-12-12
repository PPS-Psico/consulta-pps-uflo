
import { createClient } from '@supabase/supabase-js';

// ==============================================================================
// ⚙️ CONFIGURACIÓN
// ==============================================================================

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
const SUPABASE_URL = "PEGAR_TU_URL_AQUI"; 
const SERVICE_ROLE_KEY = "PEGAR_TU_SERVICE_ROLE_KEY_AQUI"; 

// --- INICIALIZACIÓN ---
if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SUPABASE_URL.includes("PEGAR_AQUI") || SERVICE_ROLE_KEY.includes("PEGAR_AQUI")) {
    console.error("❌ ERROR: Edita el archivo scripts/create-users.js y pega las credenciales (VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY).");
<<<<<<< HEAD
=======
=======
// --- CONFIGURACIÓN ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

// --- INICIALIZACIÓN ---
if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SUPABASE_URL.includes("PEGAR_AQUI") || SERVICE_ROLE_KEY.includes("PEGAR_AQUI")) {
    console.error("❌ ERROR: Faltan credenciales en .env (VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY).");
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function getAllAuthUsers() {
    let allUsers = [];
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    console.log("🔍 [1/3] Obteniendo usuarios de Auth (Sistema de Login)...");
    
    while (hasMore) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: perPage
        });

        if (error) {
            console.error("Error listing users:", error);
            return [];
        }

        allUsers = [...allUsers, ...users];
        if (users.length < perPage) {
            hasMore = false;
        } else {
            page++;
        }
    }
    console.log(`   -> ${allUsers.length} usuarios en Auth.`);
    return allUsers;
}

async function createAndVerifyUsers() {
    console.log("🚀 INICIANDO DIAGNÓSTICO Y REPARACIÓN DE USUARIOS...");

    // 1. Obtener usuarios Auth
    const existingAuthUsers = await getAllAuthUsers();
    const authMap = new Map(existingAuthUsers.map(u => [u.email.toLowerCase(), u.id]));

    // 2. Obtener estudiantes DB
    console.log("🔍 [2/3] Obteniendo estudiantes de la Base de Datos (Tabla Pública)...");
    const { data: students, error: fetchError } = await supabase
        .from('estudiantes')
        .select('id, legajo, dni, correo, nombre, user_id')
        .not('correo', 'is', null);

    if (fetchError) {
        console.error("❌ Error obteniendo estudiantes:", fetchError.message);
        return;
    }

    console.log(`   -> ${students.length} estudiantes en DB.`);
    console.log("⚙️  [3/3] Procesando vinculaciones...");

    const report = [];

    for (const student of students) {
        const email = student.correo.trim().toLowerCase();
        let password = String(student.dni).trim(); 

        // Validación básica
        if (!email || password.length < 6) {
            report.push({ legajo: student.legajo, email, status: 'SKIP (Datos inválidos)' });
            continue;
        }

        let authId = authMap.get(email);
        let status = '';

        try {
            if (authId) {
                // --- EL USUARIO YA EXISTE EN AUTH ---
                status = 'Auth Existe. ';
                
                // 1. Forzar contraseña al DNI (por si estaba vieja)
                const { error: updateError } = await supabase.auth.admin.updateUserById(
                    authId,
                    { password: password, email_confirm: true }
                );
                
                if (updateError) status += `Pass Error: ${updateError.message}. `;
                else status += `Pass OK. `;

                // 2. Verificar/Reparar Vínculo en DB
                if (student.user_id !== authId) {
                    const { error: linkError } = await supabase
                        .from('estudiantes')
                        .update({ user_id: authId })
                        .eq('id', student.id);

                    if (linkError) status += `Link Error: ${linkError.message}`;
                    else status += `Link REPARADO.`;
                } else {
                    status += `Link OK.`;
                }

            } else {
                // --- EL USUARIO NO EXISTE, CREARLO ---
                status = 'Creando Auth... ';
                const { data: authData, error: createError } = await supabase.auth.admin.createUser({
                    email: email,
                    password: password,
                    email_confirm: true,
                    user_metadata: { legajo: student.legajo, nombre: student.nombre }
                });

                if (createError) {
                    status += `Error: ${createError.message}`;
                } else if (authData.user) {
                    authId = authData.user.id;
                    const { error: linkError } = await supabase
                        .from('estudiantes')
                        .update({ user_id: authId })
                        .eq('id', student.id);
                    
                    if (linkError) status += `Creado pero Link Error: ${linkError.message}`;
                    else status += `CREADO Y VINCULADO.`;
                }
            }
        } catch (e) {
            status += `EXCEPCIÓN: ${e.message}`;
        }

        report.push({ 
            legajo: student.legajo, 
            email: email, 
            auth_id: authId || '---', 
            db_user_id: student.user_id || 'NULL (Antes)', 
            result: status 
        });
    }

    console.log("\n📊 REPORTE DE ESTADO (Últimos 15 procesados):");
    console.table(report.slice(-15)); 
    
    console.log("\n💡 SUGERENCIA: Busca tu usuario en la tabla de arriba o en el log completo.");
    console.log("   Si 'result' dice 'Link OK' o 'Link REPARADO', el login debería funcionar.");
}

createAndVerifyUsers();
