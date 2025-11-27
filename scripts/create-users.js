
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno si se ejecuta localmente con dotenv
dotenv.config();

// --- CONFIGURACIÓN ---
// Si las variables de entorno no están definidas, usa estos placeholders que el usuario debe reemplazar
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

async function createUsers() {
    console.log("🚀 Iniciando creación masiva de usuarios...");

    // 1. Obtener todos los estudiantes de la tabla pública
    const { data: students, error: fetchError } = await supabase
        .from('estudiantes')
        .select('id, legajo, dni, correo, nombre')
        .not('correo', 'is', null);

    if (fetchError) {
        console.error("❌ Error obteniendo estudiantes:", fetchError.message);
        return;
    }

    console.log(`📦 Se encontraron ${students.length} estudiantes con correo.`);

    let createdCount = 0;
    let errorCount = 0;
    let existingCount = 0;

    // 2. Iterar y crear usuarios en Auth
    for (const student of students) {
        const email = student.correo.trim();
        const password = String(student.dni).trim(); // DNI como contraseña inicial
        
        if (!email || !password) {
            console.warn(`⚠️ Saltando estudiante ${student.legajo}: Falta email o DNI.`);
            continue;
        }

        try {
            // Crear usuario en Supabase Auth (admin)
            // email_confirm: true para que no necesiten verificar correo inmediatamente
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
                // Si ya existe, no es un error fatal, solo informamos
                if (authError.message.includes("already been registered")) {
                    process.stdout.write("."); // Progreso visual mínimo
                    existingCount++;
                } else {
                    console.error(`\n❌ Error creando usuario ${student.legajo} (${email}):`, authError.message);
                    errorCount++;
                }
                continue;
            }

            if (authData.user) {
                // 3. Actualizar la tabla 'estudiantes' para poner el flag 'must_change_password' en true.
                // Esto obliga al usuario a cambiar su contraseña en el primer login.
                
                await supabase
                    .from('estudiantes')
                    .update({ must_change_password: true })
                    .eq('id', student.id);

                process.stdout.write("✅");
                createdCount++;
            }

        } catch (e) {
            console.error(`\n❌ Excepción con ${student.legajo}:`, e.message);
            errorCount++;
        }
    }

    console.log("\n\n=== RESUMEN ===");
    console.log(`✅ Creados exitosamente: ${createdCount}`);
    console.log(`⚠️ Ya existían: ${existingCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log("==================");
}

createUsers();
