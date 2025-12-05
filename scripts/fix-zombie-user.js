
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// --- CONFIGURACIÓN ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

// Legajo a reparar
const TARGET_LEGAJO = '31341';

// --- INICIALIZACIÓN ---
if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SUPABASE_URL.includes("PEGAR_AQUI")) {
    console.error("❌ ERROR: Faltan credenciales en .env.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function repairUser() {
    console.log(`\n🚑 INICIANDO REPARACIÓN PARA LEGAJO: ${TARGET_LEGAJO}`);

    // 1. Buscar al estudiante en la base de datos pública
    const { data: student, error: studentError } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('legajo', TARGET_LEGAJO)
        .single();

    if (studentError || !student) {
        console.error(`❌ No se encontró al estudiante con legajo ${TARGET_LEGAJO} en la tabla 'estudiantes'.`);
        return;
    }

    console.log(`✅ Estudiante encontrado: ${student.nombre} (ID DB: ${student.id})`);
    console.log(`   Estado actual user_id: ${student.user_id ? student.user_id : 'NULL (Correcto si no está registrado)'}`);

    if (!student.user_id) {
        console.log("🎉 El usuario no tiene user_id vinculado. Debería poder registrarse normalmente.");
        console.log("   Si tiene problemas, verifique que su DNI y Correo coincidan con los que intenta ingresar.");
        return;
    }

    // 2. Verificar si ese user_id existe realmente en Auth
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(student.user_id);

    if (user) {
        console.log(`✅ El usuario existe en Auth System (Email: ${user.email}).`);
        console.log("   El problema NO es un usuario huérfano.");
        console.log("   Posible causa: Contraseña incorrecta o email no confirmado.");
        
        // Opcional: Forzar nueva contraseña para desbloquearlo
        console.log("   🔄 Intentando restaurar contraseña al DNI para desbloquear...");
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            student.user_id,
            { password: String(student.dni), email_confirm: true }
        );
        
        if (!updateError) {
            console.log(`   ✅ Contraseña restablecida temporalmente a su DNI: ${student.dni}`);
            console.log(`   👉 Indique al usuario que intente ingresar con su DNI como contraseña.`);
        } else {
            console.error(`   ❌ Error al resetear contraseña: ${updateError.message}`);
        }

    } else {
        console.log(`⚠️ ALERTA: El estudiante apunta a un user_id (${student.user_id}) que NO EXISTE en Auth.`);
        console.log("   Esto es un 'Zombie User'. El sistema cree que está registrado pero no puede loguear.");
        
        // 3. Reparar (Resetear a NULL)
        console.log("🛠️  Reparando vínculo...");
        const { error: fixError } = await supabase
            .from('estudiantes')
            .update({ user_id: null })
            .eq('id', student.id);

        if (fixError) {
            console.error(`   ❌ Falló la reparación: ${fixError.message}`);
        } else {
            console.log(`   ✅ ¡REPARACIÓN EXITOSA!`);
            console.log(`   El estudiante ${student.nombre} ha sido reseteado.`);
            console.log(`   👉 Ahora debe ir a 'Crear Usuario' y registrarse nuevamente como si fuera la primera vez.`);
        }
    }
}

repairUser();
