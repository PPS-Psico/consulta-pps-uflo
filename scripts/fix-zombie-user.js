
import { createClient } from '@supabase/supabase-js';

// ==============================================================================
// ⚙️ CONFIGURACIÓN MANUAL
// ==============================================================================
// Pega tus credenciales de Supabase aquí abajo dentro de las comillas.
// Necesitas la URL y la KEY con permisos de "Service Role" (no la Anon).
// ==============================================================================

const SUPABASE_URL = "PEGAR_TU_URL_AQUI"; 
const SERVICE_ROLE_KEY = "PEGAR_TU_SERVICE_ROLE_KEY_AQUI"; 

// El legajo del estudiante que tiene problemas (CAMBIAR ESTO CADA VEZ)
const TARGET_LEGAJO = '31341';

// ==============================================================================

if (SUPABASE_URL.includes("PEGAR") || SERVICE_ROLE_KEY.includes("PEGAR")) {
    console.error("❌ ERROR: Debes editar el archivo scripts/fix-zombie-user.js y pegar tus credenciales reales.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function repairUser() {
    console.log(`\n🚑 INICIANDO DIAGNÓSTICO PARA LEGAJO: ${TARGET_LEGAJO}`);

    // 1. Buscar al estudiante en la base de datos pública
    const { data: student, error: studentError } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('legajo', TARGET_LEGAJO)
        .single();

    if (studentError || !student) {
        console.error(`❌ No se encontró al estudiante con legajo ${TARGET_LEGAJO} en la tabla 'estudiantes'.`);
        if (studentError) console.error("Error DB:", studentError.message);
        return;
    }

    console.log(`✅ Estudiante encontrado: ${student.nombre} (ID DB: ${student.id})`);

    // CASO 1: NO TIENE USUARIO VINCULADO
    if (!student.user_id) {
        console.log("\n🔍 RESULTADO: El alumno NO tiene una cuenta creada todavía.");
        console.log("   (El campo user_id está vacío, lo cual es correcto para alumnos nuevos).");
        
        console.log("\n📢 --- INSTRUCCIONES PARA ENVIAR AL ALUMNO ---");
        console.log("Dígale exactamente lo siguiente:");
        console.log("---------------------------------------------------");
        console.log(`1. Entrá a la web.`);
        console.log(`2. Hacé clic en el botón "Crear Usuario" (NO uses "Iniciar Sesión").`);
        console.log(`3. Ingresá tu Legajo: ${student.legajo}`);
        console.log(`4. El sistema te pedirá validar tu identidad. Debés ingresar estos datos EXACTOS:`);
        console.log(`   - DNI: ${student.dni}`);
        console.log(`   - Correo: ${student.correo}`);
        console.log(`5. Si los datos coinciden, podrás crear tu contraseña y entrar.`);
        console.log("---------------------------------------------------");
        return;
    }

    // 2. Verificar si ese user_id existe realmente en Auth
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(student.user_id);

    // CASO 2: USUARIO EXISTE (NO ES ZOMBIE)
    if (user) {
        console.log(`\n✅ RESULTADO: El usuario YA EXISTE correctamente (Email: ${user.email}).`);
        console.log("   El problema NO es de sistema. Probablemente olvidó su contraseña.");
        
        console.log("\n📢 --- INSTRUCCIONES PARA ENVIAR AL ALUMNO ---");
        console.log("---------------------------------------------------");
        console.log("1. Tu usuario ya está creado y activo.");
        console.log("2. Ve a 'Iniciar Sesión'.");
        console.log("3. Si no recuerdas tu clave, haz clic en '¿Olvidaste tu contraseña?'.");
        console.log(`4. Te llegará un mail a: ${user.email}`);
        console.log("---------------------------------------------------");

    } else {
        // CASO 3: ES UN ZOMBIE (Tiene ID en DB, pero no existe en Auth)
        console.log(`\n⚠️ ALERTA CRÍTICA: Usuario Zombie detectado.`);
        console.log(`   La base de datos apunta a un usuario (${student.user_id}) que FUE BORRADO.`);
        console.log("   Esto impide que el alumno se registre de nuevo.");
        
        // 3. Reparar (Resetear a NULL)
        console.log("🛠️  Reparando vínculo roto...");
        const { error: fixError } = await supabase
            .from('estudiantes')
            .update({ user_id: null })
            .eq('id', student.id);

        if (fixError) {
            console.error(`   ❌ Falló la reparación: ${fixError.message}`);
        } else {
            console.log(`   ✅ ¡REPARACIÓN EXITOSA! Se limpió el registro.`);
            
            console.log("\n📢 --- INSTRUCCIONES PARA ENVIAR AL ALUMNO ---");
            console.log("---------------------------------------------------");
            console.log("Hubo un error técnico con tu usuario anterior que ya fue solucionado.");
            console.log("Por favor, volvé a registrarte como si fueras nuevo:");
            console.log(`1. Clic en 'Crear Usuario'.`);
            console.log(`2. Ingresá tu Legajo ${student.legajo}, DNI y Correo.`);
            console.log("3. Creá una contraseña nueva.");
            console.log("---------------------------------------------------");
        }
    }
}

repairUser();
