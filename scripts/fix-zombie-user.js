import { createClient } from "@supabase/supabase-js";

// ==============================================================================
// ⚙️ CONFIGURACIÓN
// ==============================================================================

const SUPABASE_URL = "PEGAR_TU_URL_AQUI";
const SERVICE_ROLE_KEY = "PEGAR_TU_SERVICE_ROLE_KEY_AQUI";

const TARGET_LEGAJO = "33426"; // Legajo de Maria Azul

// ==============================================================================

if (SUPABASE_URL.includes("PEGAR") || SERVICE_ROLE_KEY.includes("PEGAR")) {
  console.error("❌ ERROR: Edita el archivo y pega las credenciales (SERVICE ROLE KEY).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fixStudent() {
  console.log(`\n🕵️  DIAGNÓSTICO Y REPARACIÓN PARA LEGAJO: ${TARGET_LEGAJO}`);

  // 1. Buscar datos en la Base de Datos (Tabla Pública)
  const { data: students, error } = await supabase
    .from("estudiantes")
    .select("*")
    .eq("legajo", TARGET_LEGAJO);

  if (error || !students || students.length === 0) {
    console.error("❌ No se encontró el legajo en la tabla 'estudiantes'.");
    return;
  }

  const student = students[0];
  const email = student.correo;

  console.log(`   👤 Alumno: ${student.nombre}`);
  console.log(`   📧 Email DB: ${email}`);
  console.log(`   🆔 DNI DB: ${student.dni}`);

  if (!email) {
    console.error("❌ El alumno no tiene email en la base de datos.");
    return;
  }

  // 2. Buscar si el email existe en Supabase Auth (Sistema de Login)
  console.log(`\n🔍 Buscando usuario en el sistema de Autenticación...`);

  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listError) {
    console.error("❌ Error listando usuarios:", listError.message);
    return;
  }

  const authUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (authUser) {
    console.log(`   ⚠️  USUARIO ENCONTRADO EN AUTH (ID: ${authUser.id})`);
    console.log(`   🧹 Eliminando usuario de Auth para permitir re-registro...`);

    const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.id);

    if (deleteError) {
      console.error(`   ❌ Error eliminando usuario: ${deleteError.message}`);
    } else {
      console.log(`   ✅ Usuario de Auth eliminado correctamente.`);
    }
  } else {
    console.log(`   ✅ No existe usuario en Auth (El email está libre).`);
  }

  // 3. Limpiar vínculo en la base de datos (poner user_id en NULL)
  if (student.user_id !== null) {
    console.log(`\n🔗 Desvinculando registro en base de datos...`);
    const { error: updateError } = await supabase
      .from("estudiantes")
      .update({ user_id: null })
      .eq("id", student.id);

    if (updateError) console.error(`   ❌ Error DB: ${updateError.message}`);
    else console.log(`   ✅ Registro en DB puesto a NULL.`);
  } else {
    console.log(`   ✅ El registro en DB ya estaba libre (user_id era NULL).`);
  }

  // ==============================================================================
  // 📢 MENSAJE FINAL PARA EL ESTUDIANTE
  // ==============================================================================
  console.log("\n================================================================");
  console.log("✅ REPARACIÓN EXITOSA. COPIA Y PEGA ESTE MENSAJE AL ESTUDIANTE:");
  console.log("================================================================");
  console.log(`
Hola ${student.nombre.split(" ")[0]},

Ya hemos reiniciado tu cuenta. Por favor seguí estos pasos exactos:

1. Ingresá a la web de la aplicación.
2. Hacé clic en "No tienes cuenta? Crear una nueva" (abajo de todo).
3. Ingresá tu Legajo: ${TARGET_LEGAJO}

⚠️ IMPORTANTE: Cuando te pida validar tus datos, ingresalos EXACTAMENTE así (tal cual figuran en nuestro sistema):

• DNI: ${student.dni}
• Correo: ${student.correo}
• Teléfono: ${student.telefono || "(Dejar vacío o poner tu celular actual)"}

Luego podrás crear tu nueva contraseña.
    `);
  console.log("================================================================\n");
}

fixStudent();
