
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno si se ejecuta localmente con dotenv
dotenv.config();

// --- CONFIGURACIÓN ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "PEGAR_AQUI_TU_SUPABASE_URL";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "PEGAR_AQUI_TU_SUPABASE_SERVICE_ROLE_KEY"; 

// --- INICIALIZACIÓN ---
if (SUPABASE_URL.includes("PEGAR_AQUI") || SERVICE_ROLE_KEY.includes("PEGAR_AQUI")) {
    console.error("❌ ERROR: Debes configurar las credenciales en el script o usar variables de entorno (.env).");
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
    const perPage = 1000; // Max usually
    let hasMore = true;

    console.log("🔍 Obteniendo usuarios existentes de Auth...");
    
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
    console.log(`   -> Encontrados ${allUsers.length} usuarios en Auth.`);
    return allUsers;
}

async function createUsers() {
    console.log("🚀 Iniciando reparación y creación de usuarios...");

    // 1. Obtener mapa de usuarios Auth existentes (Email -> ID)
    const existingAuthUsers = await getAllAuthUsers();
    const authMap = new Map(existingAuthUsers.map(u => [u.email.toLowerCase(), u.id]));

    // 2. Obtener todos los estudiantes de la tabla pública
    const { data: students, error: fetchError } = await supabase
        .from('estudiantes')
        .select('id, legajo, dni, correo, nombre')
        .not('correo', 'is', null);

    if (fetchError) {
        console.error("❌ Error obteniendo estudiantes:", fetchError.message);
        return;
    }

    console.log(`📦 Procesando ${students.length} registros de estudiantes...`);

    let createdCount = 0;
    let linkedCount = 0;
    let errorCount = 0;

    // 3. Iterar y procesar
    for (const student of students) {
        const email = student.correo.trim().toLowerCase();
        const password = String(student.dni).trim(); 
        
        if (!email || !password) {
            console.warn(`⚠️ Saltando estudiante ${student.legajo}: Falta email o DNI.`);
            continue;
        }

        let userId = authMap.get(email);

        if (userId) {
            // CASO A: El usuario ya existe en Auth -> REPARAR VÍNCULO Y FORZAR CONTRASEÑA
            
            // 1. Forzar actualización de contraseña al DNI
            const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
                userId,
                { password: password }
            );

            if (authUpdateError) {
                 console.error(`\n❌ Error actualizando contraseña para ${student.legajo}:`, authUpdateError.message);
                 // No incrementamos errorCount aquí para intentar al menos vincular la DB
            }

            // 2. Actualizar registro en la base de datos pública
            const { error: updateError } = await supabase
                .from('estudiantes')
                .update({ 
                    user_id: userId,
                    must_change_password: true 
                })
                .eq('id', student.id);

            if (updateError) {
                 console.error(`\n❌ Error vinculando ${student.legajo}:`, updateError.message);
                 errorCount++;
            } else {
                process.stdout.write("."); // Linked/Repaired
                linkedCount++;
            }
            
        } else {
            // CASO B: El usuario NO existe -> CREAR
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
                    console.error(`\n❌ Error creando usuario ${student.legajo} (${email}):`, authError.message);
                    errorCount++;
                    continue;
                }

                if (authData.user) {
                    userId = authData.user.id;
                    
                    // Vincular en DB
                    await supabase
                        .from('estudiantes')
                        .update({ 
                            must_change_password: true,
                            user_id: userId 
                        })
                        .eq('id', student.id);

                    process.stdout.write("+"); // Created
                    createdCount++;
                }
            } catch (e) {
                console.error(`\n❌ Excepción con ${student.legajo}:`, e.message);
                errorCount++;
            }
        }
    }

    console.log("\n\n=== RESUMEN ===");
    console.log(`✨ Usuarios Creados: ${createdCount}`);
    console.log(`🔗 Usuarios Vinculados/Actualizados: ${linkedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log("==================");
}

createUsers();
