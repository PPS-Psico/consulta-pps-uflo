
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno si se ejecuta localmente con dotenv
dotenv.config();

// --- CONFIGURACIÓN ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

// --- INICIALIZACIÓN ---
if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SUPABASE_URL.includes("PEGAR_AQUI") || SERVICE_ROLE_KEY.includes("PEGAR_AQUI")) {
    console.error("❌ ERROR: Faltan credenciales en .env (VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY).");
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

    console.log("🔍 [1/4] Obteniendo usuarios existentes de Auth...");
    
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
    console.log(`   -> ${allUsers.length} usuarios encontrados en Auth.`);
    return allUsers;
}

async function createUsers() {
    console.log("🚀 Iniciando proceso de reparación de usuarios...");

    // 1. Obtener mapa de usuarios Auth existentes (Email -> ID)
    const existingAuthUsers = await getAllAuthUsers();
    const authMap = new Map(existingAuthUsers.map(u => [u.email.toLowerCase(), u.id]));

    // 2. Obtener todos los estudiantes de la tabla pública
    console.log("🔍 [2/4] Leyendo tabla 'estudiantes'...");
    const { data: students, error: fetchError } = await supabase
        .from('estudiantes')
        .select('id, legajo, dni, correo, nombre, user_id')
        .not('correo', 'is', null);

    if (fetchError) {
        console.error("❌ Error obteniendo estudiantes:", fetchError.message);
        return;
    }

    console.log(`   -> ${students.length} estudiantes encontrados.`);
    console.log("⚙️  [3/4] Procesando vinculaciones y contraseñas...");

    let createdCount = 0;
    let updatedCount = 0;
    let linkedCount = 0;
    let errorCount = 0;

    // 3. Iterar y procesar
    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        
        // Barra de progreso simple
        if (i % 10 === 0) process.stdout.write(".");

        const email = student.correo.trim().toLowerCase();
        const password = String(student.dni).trim(); 
        
        if (!email || password.length < 6) {
            // DNI menor a 6 caracteres o sin mail
            continue;
        }

        let userId = authMap.get(email);

        if (userId) {
            // === CASO A: El usuario YA EXISTE en Auth ===
            // Acciones: 
            // 1. Forzar cambio de contraseña al DNI actual (por si era vieja).
            // 2. Asegurar que student.user_id sea igual a userId.

            // Paso 1: Actualizar contraseña
            const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
                userId,
                { password: password, email_confirm: true }
            );

            if (updateAuthError) {
                console.error(`\n❌ Error pass ${student.legajo}: ${updateAuthError.message}`);
                errorCount++;
            } else {
                updatedCount++;
            }

            // Paso 2: Verificar y Reparar Vínculo en DB Pública
            // Si el user_id en la DB no coincide o está vacío, lo actualizamos.
            if (student.user_id !== userId) {
                const { error: linkError } = await supabase
                    .from('estudiantes')
                    .update({ 
                        user_id: userId,
                        must_change_password: true 
                    })
                    .eq('id', student.id);

                if (linkError) {
                    console.error(`\n❌ Error vinculando ${student.legajo}: ${linkError.message}`);
                    errorCount++;
                } else {
                    linkedCount++;
                }
            }
            
        } else {
            // === CASO B: El usuario NO EXISTE en Auth ===
            // Acciones: Crear usuario y vincular.
            
            try {
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email: email,
                    password: password,
                    email_confirm: true, 
                    user_metadata: {
                        legajo: student.legajo,
                        nombre: student.nombre
                    }
                });

                if (authError) {
                    console.error(`\n❌ Error creando auth ${student.legajo}: ${authError.message}`);
                    errorCount++;
                    continue;
                }

                if (authData.user) {
                    userId = authData.user.id;
                    
                    // Vincular en DB
                    const { error: linkError } = await supabase
                        .from('estudiantes')
                        .update({ 
                            user_id: userId,
                            must_change_password: true
                        })
                        .eq('id', student.id);
                    
                    if (linkError) {
                         console.error(`\n❌ Error vinculando nuevo ${student.legajo}: ${linkError.message}`);
                    } else {
                        createdCount++;
                        linkedCount++;
                    }
                }
            } catch (e) {
                console.error(`\n❌ Excepción con ${student.legajo}:`, e.message);
                errorCount++;
            }
        }
    }

    console.log("\n\n=== [4/4] RESUMEN FINAL ===");
    console.log(`✨ Usuarios Nuevos Creados: ${createdCount}`);
    console.log(`🔑 Contraseñas Actualizadas: ${updatedCount}`);
    console.log(`🔗 Vínculos (user_id) Reparados/Creados: ${linkedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log("======================");
}

createUsers();
