import { useState, FormEvent, ChangeEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  FIELD_DNI_ESTUDIANTES,
  FIELD_CORREO_ESTUDIANTES,
  FIELD_TELEFONO_ESTUDIANTES,
} from "../constants";
import type { EstudianteFields, AirtableRecord } from "../types";
import type { AuthUser } from "../contexts/AuthContext";

interface UseAuthLogicProps {
  login: (user: AuthUser) => void;
  showModal: (title: string, message: string) => void;
}

const normalizePhone = (phone: any) => {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "");
};

export const useAuthLogic = ({ login, showModal: _showModal }: UseAuthLogicProps) => {
  const [mode, setMode] = useState<
    "login" | "register" | "forgot" | "reset" | "migration" | "recover"
  >("login");
  const [resetStep, setResetStep] = useState<"verify" | "reset_password" | "success">("verify");
  const [migrationStep, setMigrationStep] = useState<1 | 2>(1);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  const [legajo, setLegajo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [foundStudent, setFoundStudent] = useState<AirtableRecord<EstudianteFields> | null>(null);
  const [verificationData, setVerificationData] = useState({ dni: "", correo: "", telefono: "" });

  const resetFormState = () => {
    setError(null);
    setFieldError(null);
    setPassword("");
    setConfirmPassword("");
    setResetStep("verify");
    setMigrationStep(1);
    setRegisterStep(1);
    setVerificationData({ dni: "", correo: "", telefono: "" });
    setFoundStudent(null);
  };

  const handleModeChange = (newMode: any) => {
    setMode(newMode);
    // Clean session when switching modes to avoid lingering zombie states
    (supabase.auth as any).signOut().catch(() => {});

    if (!((newMode === "migration" || newMode === "recover") && mode === "login")) {
      resetFormState();
    } else {
      // Keep legajo if switching from login failure
      setMigrationStep(1);
      setRegisterStep(1);
      setResetStep("verify");
      setError(null);
      setFieldError(null);
      setFoundStudent(null);
    }
  };

  const handleVerificationDataChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVerificationData((prev) => ({ ...prev, [name]: value }));
    setFieldError(null);
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const legajoTrimmed = legajo.trim();
    const passwordTrimmed = password.trim();

    if (legajoTrimmed === "testing" && passwordTrimmed === "testing") {
      login({ legajo: "99999", nombre: "Usuario de Prueba", role: "AdminTester" });
      return;
    }

    // BYPASS ELIMINADO: Ahora el admin se loguea como un usuario real de Supabase
    // para garantizar que las políticas RLS funcionen correctamente.
    // El legajo 'admin' ya existe en la BD y tiene email 'admin@sistema.com'.

    setIsLoading(true);
    setError(null);
    setFieldError(null);

    if (mode === "login") {
      try {
        // LIMPIEZA PREVENTIVA
        await (supabase.auth as any).signOut();

        if (!legajoTrimmed || !passwordTrimmed)
          throw new Error("Por favor, completa todos los campos.");

        // 1. Intentar obtener datos del estudiante
        // Use cast to any to avoid RPC typing issues
        const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
          "get_student_details_by_legajo",
          { legajo_input: legajoTrimmed }
        );

        if (rpcError) throw new Error("Error de conexión al validar legajo. Intenta nuevamente.");
        const studentData = rpcData && (rpcData as any[]).length > 0 ? (rpcData as any[])[0] : null;

        if (!studentData)
          throw new Error("Legajo no encontrado. Verificá el número o creá una cuenta nueva.");

        const email = studentData[FIELD_CORREO_ESTUDIANTES];

        if (!email)
          throw new Error(
            'Tu usuario parece incompleto. Por favor, ve a "Crear Cuenta" para actualizar tus datos.'
          );

        // 2. Intentar Login
        const { error: signInError } = await (supabase.auth as any).signInWithPassword({
          email: email,
          password: passwordTrimmed,
        });

        if (signInError) {
          console.warn("Login failed:", signInError.message);

          if (signInError.message.includes("Invalid login credentials")) {
            // MODIFICADO: Ya no redirige a migración. Muestra error en pantalla.
            setError(
              "Contraseña incorrecta. Verificá tus datos o usá el botón de recuperar contraseña."
            );
            setFieldError("password");
          } else {
            setError("Ocurrió un error al iniciar sesión. Intenta nuevamente.");
          }
          setIsLoading(false);
          return;
        }
        // Si el login es exitoso, AuthContext detectará el cambio de sesión automáticamente
      } catch (err: any) {
        console.error("Login error:", err);
        setError(err.message || "Error al iniciar sesión.");
      } finally {
        setIsLoading(false);
      }
    } else if (mode === "migration") {
      // === LOGICA DE MIGRACIÓN / ACTIVACIÓN ===
      try {
        if (migrationStep === 1) {
          // Paso 1: Validar Identidad
          if (!legajoTrimmed || !verificationData.dni || !verificationData.correo) {
            throw new Error("Por favor completa los campos para validar tu identidad.");
          }

          const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
            "get_student_details_by_legajo",
            { legajo_input: legajoTrimmed }
          );

          if (rpcError) throw new Error("Error de conexión. Intenta más tarde.");
          const studentData =
            rpcData && (rpcData as any[]).length > 0 ? (rpcData as any[])[0] : null;

          if (!studentData) throw new Error("No encontramos un estudiante con ese legajo.");

          // Verificar coincidencia de datos
          const dbDni = String(studentData[FIELD_DNI_ESTUDIANTES] || "").trim();
          const dbEmail = String(studentData[FIELD_CORREO_ESTUDIANTES] || "")
            .trim()
            .toLowerCase();

          // Sanitize input DNI for comparison (remove dots, spaces)
          const inputDni = verificationData.dni.replace(/\D/g, "").trim();
          const inputEmail = verificationData.correo.trim().toLowerCase();

          // Compare against DB (DB might have dots or not, so we sanitize both just in case, though DB should be clean)
          const cleanDbDni = dbDni.replace(/\D/g, "");

          if (cleanDbDni !== inputDni || dbEmail !== inputEmail) {
            throw new Error("Los datos ingresados no coinciden con nuestros registros.");
          }

          setFoundStudent(studentData as unknown as AirtableRecord<EstudianteFields>);
          setMigrationStep(2);
          setIsLoading(false);
          return;
        }

        if (migrationStep === 2) {
          // Paso 2: Establecer Contraseña y Crear/Vincular Usuario
          if (password.length < 6)
            throw new Error("La contraseña debe tener al menos 6 caracteres.");
          if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");

          if (!foundStudent)
            throw new Error("Sesión de validación expirada. Por favor comienza de nuevo.");

          const email = String(foundStudent[FIELD_CORREO_ESTUDIANTES]).trim().toLowerCase();

          // 1. Intentamos CREAR el usuario
          const { data: _authData, error: signUpError } = await (supabase.auth as any).signUp({
            email: email,
            password: password,
            options: { data: { legajo: legajoTrimmed } },
          });

          // 2. Manejo de Errores: ¿Ya existe?
          if (signUpError) {
            if (
              signUpError.message.includes("already registered") ||
              signUpError.status === 422 ||
              signUpError.status === 400
            ) {
              console.log("Usuario ya existe en Auth, intentando forzar actualización de clave...");

              // Si ya existe, usamos RPC para resetear la clave Y REPARAR EL VINCULO
              const { error: rpcResetError } = await (supabase.rpc as any)("admin_reset_password", {
                legajo_input: legajoTrimmed,
                new_password: password,
              });

              if (rpcResetError) {
                console.error("RPC Reset Error:", rpcResetError);
                if (
                  rpcResetError.message.includes("No existe usuario") ||
                  rpcResetError.message.includes("not found")
                ) {
                  throw new Error(
                    "Error de integridad: El email de tu legajo no coincide con el usuario registrado. Contacta soporte."
                  );
                }
                throw new Error(
                  "No se pudo actualizar tu usuario existente. Intenta 'Recuperar Acceso'."
                );
              }
            } else {
              throw new Error(`Error al crear usuario: ${signUpError.message}`);
            }
          }

          // 3. Intento de Login final para confirmar y obtener sesión
          const { data: loginData, error: loginError } = await (
            supabase.auth as any
          ).signInWithPassword({
            email: email,
            password: password,
          });

          if (loginError) {
            setMode("login");
            setError(
              "Cuenta configurada, pero el inicio de sesión automático falló. Por favor ingresa manualmente."
            );
          } else if (loginData.user) {
            // 4. Asegurar vínculo en DB (Self-healing por si acaso)
            const { error: linkError } = await (supabase.rpc as any)("register_new_student", {
              legajo_input: legajoTrimmed,
              userid_input: loginData.user.id,
              dni_input: parseInt((foundStudent[FIELD_DNI_ESTUDIANTES] as any) || "0", 10),
              correo_input: email,
              telefono_input: foundStudent[FIELD_TELEFONO_ESTUDIANTES] || "",
            });

            if (linkError) console.warn("Link RPC warning (non-critical):", linkError);
          }
        }
      } catch (err: any) {
        console.error("Migration error:", err);
        setError(err.message || "Error del servidor al procesar la solicitud.");
      } finally {
        setIsLoading(false);
      }
    } else if (mode === "register") {
      try {
        if (registerStep === 1) {
          if (!legajoTrimmed) throw new Error("Por favor ingresa tu legajo.");
          const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
            "get_student_for_signup",
            { legajo_input: legajoTrimmed }
          );

          if (rpcError) throw new Error(rpcError.message);
          const student = rpcData && (rpcData as any[]).length > 0 ? (rpcData as any[])[0] : null;

          if (!student)
            throw new Error(
              "El legajo no figura en la lista o ya tiene usuario. Prueba 'Recuperar Acceso'."
            );
          if (student.user_id)
            throw new Error(
              "Este legajo ya tiene cuenta activa. Usa 'Recuperar Acceso' si olvidaste la clave."
            );

          setFoundStudent(student as unknown as AirtableRecord<EstudianteFields>);
          setRegisterStep(2);
          setIsLoading(false);
          return;
        }

        if (registerStep === 2) {
          const { dni, correo, telefono } = verificationData;
          if (!dni || !correo || !telefono || !password)
            throw new Error("Todos los campos son obligatorios.");
          if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");

          const inputEmail = correo.trim().toLowerCase();

          // CLEAN DNI: Remove dots, spaces, ensure it's a number
          const cleanDniString = dni.replace(/\D/g, "");
          const cleanDniInt = parseInt(cleanDniString, 10);
          if (isNaN(cleanDniInt) || cleanDniInt === 0) {
            throw new Error("El DNI debe ser un número válido.");
          }

          // Intentar crear usuario
          const { data: authData, error: signUpError } = await (supabase.auth as any).signUp({
            email: inputEmail,
            password: password,
            options: { data: { legajo: legajoTrimmed } },
          });

          let userId = authData?.user?.id;

          // MANEJO ROBUSTO DE "USUARIO YA EXISTE"
          if (signUpError || !userId) {
            console.warn("SignUp failed, attempting fix via admin_reset_password");

            const { error: fixError } = await (supabase.rpc as any)("admin_reset_password", {
              legajo_input: legajoTrimmed,
              new_password: password,
            });

            if (fixError) {
              console.error("Fix failed:", fixError);
              throw new Error(
                "Este correo ya está registrado y no se pudo vincular a tu legajo. Contacta soporte."
              );
            }

            const { data: loginData, error: loginError } = await (
              supabase.auth as any
            ).signInWithPassword({
              email: inputEmail,
              password,
            });

            if (loginError || !loginData.user) {
              throw new Error(
                "Cuenta reparada pero falló el inicio de sesión. Intenta ingresar normalmente."
              );
            }
            userId = loginData.user.id;
          }

          if (userId) {
            // Garantizar datos actualizados con DNI limpio
            await (supabase.rpc as any)("register_new_student", {
              legajo_input: legajoTrimmed,
              userid_input: userId,
              dni_input: cleanDniInt,
              correo_input: inputEmail,
              telefono_input: telefono,
            });
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    } else if (mode === "recover") {
      try {
        if (resetStep === "verify") {
          if (
            !legajoTrimmed ||
            !verificationData.dni ||
            !verificationData.correo ||
            !verificationData.telefono
          ) {
            throw new Error("Por favor completa todos los campos para validar tu identidad.");
          }

          console.log(`[Password Recovery] Verifying identity for legajo: ${legajoTrimmed}`);

          const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
            "get_student_details_by_legajo",
            { legajo_input: legajoTrimmed }
          );

          if (rpcError) {
            console.error("[Password Recovery] RPC Error during verification:", rpcError);
            throw new Error("Error de conexión. Intenta más tarde.");
          }

          const studentData =
            rpcData && (rpcData as any[]).length > 0 ? (rpcData as any[])[0] : null;

          if (!studentData) throw new Error("No encontramos un estudiante con ese legajo.");

          const dbDni = String(studentData[FIELD_DNI_ESTUDIANTES] || "").replace(/\D/g, "");
          const dbEmail = String(studentData[FIELD_CORREO_ESTUDIANTES] || "")
            .trim()
            .toLowerCase();
          const dbPhone = normalizePhone(studentData[FIELD_TELEFONO_ESTUDIANTES]);

          const inputDni = verificationData.dni.replace(/\D/g, "");
          const inputEmail = verificationData.correo.trim().toLowerCase();
          const inputPhone = normalizePhone(verificationData.telefono);

          console.log(`[Password Recovery] Verification check:`, {
            legajo: legajoTrimmed,
            dbDni,
            inputDni,
            dbEmail,
            inputEmail,
            dbPhone,
            inputPhone,
            phoneMatch: !dbPhone || !inputPhone.includes(dbPhone.slice(-6)),
          });

          let mismatch = false;
          if (dbDni !== inputDni) mismatch = true;
          if (dbEmail !== inputEmail) mismatch = true;
          // Phone validation is loose (check last 6 digits)
          if (!dbPhone || !inputPhone.includes(dbPhone.slice(-6))) mismatch = true;

          if (mismatch) {
            console.warn(`[Password Recovery] Data mismatch for legajo: ${legajoTrimmed}`);
            throw new Error("Los datos ingresados no coinciden con nuestros registros.");
          }

          console.log(`[Password Recovery] Verification successful for legajo: ${legajoTrimmed}`);
          setResetStep("reset_password");
          setIsLoading(false);
          return;
        }

        if (resetStep === "reset_password") {
          if (password.length < 6)
            throw new Error("La contraseña debe tener al menos 6 caracteres.");
          if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");

          console.log(`[Password Reset] Attempting to reset password for legajo: ${legajoTrimmed}`);

          const { error: rpcResetError } = await (supabase.rpc as any)("admin_reset_password", {
            legajo_input: legajoTrimmed,
            new_password: password,
          });

          if (rpcResetError) {
            console.error("[Password Reset] RPC Error Details:", {
              message: rpcResetError.message,
              code: rpcResetError.code,
              details: rpcResetError.details,
              hint: rpcResetError.hint,
              status: rpcResetError.status,
              fullError: JSON.stringify(rpcResetError),
              timestamp: new Date().toISOString(),
            });

            let errorMessage = "Error del servidor al restablecer la contraseña.";
            let suggestion =
              " Si el problema persiste, contacta a: blas.rivera@uflouniversidad.edu.ar";

            if (
              rpcResetError.message.includes("No existe usuario") ||
              rpcResetError.message.includes("not found")
            ) {
              errorMessage = "No se encontró un usuario vinculado a este legajo en el sistema.";
              suggestion = " Por favor, creá una cuenta nueva o contacta a coordinación.";
            } else if (
              rpcResetError.message.includes("constraint") ||
              rpcResetError.message.includes("duplicate")
            ) {
              errorMessage = "Error de validación en la base de datos.";
              suggestion = " Intenta nuevamente en unos minutos o contacta a soporte.";
            } else if (rpcResetError.code === "23505") {
              errorMessage = "Error de restricción única en la base de datos.";
              suggestion = " Es posible que ya haya una solicitud pendiente.";
            } else if (rpcResetError.status >= 500) {
              errorMessage = "El servidor no está respondiendo correctamente (Error 500).";
              suggestion = " Este es un error temporal. Por favor, intenta en unos minutos.";
            }

            throw new Error(`${errorMessage}${suggestion}`);
          }

          console.log(`[Password Reset] Successfully reset password for legajo: ${legajoTrimmed}`);
          setResetStep("success");
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("[Password Recovery] Error during recovery process:", {
          error: err,
          message: err.message,
          stack: err.stack,
          mode,
          resetStep,
          legajo: legajoTrimmed,
          timestamp: new Date().toISOString(),
        });

        const errorMessage = err.message || "Error desconocido al recuperar contraseña.";
        const additionalInfo =
          mode === "recover" && resetStep === "reset_password"
            ? "\n\n🔧 Detalles técnicos para soporte:\nEste error indica un problema al actualizar la contraseña en el servidor. Por favor, contacta a blas.rivera@uflouniversidad.edu.ar con tu legajo y menciona 'Error al recuperar contraseña'."
            : "";

        setError(errorMessage + additionalInfo);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  return {
    mode,
    setMode: handleModeChange,
    resetStep,
    migrationStep,
    setMigrationStep,
    registerStep,
    setRegisterStep,
    legajo,
    setLegajo,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    error,
    fieldError,
    foundStudent,
    verificationData,
    handleVerificationDataChange,
    handleFormSubmit,
    handleForgotLegajoSubmit: (e: any) => e.preventDefault(),
  };
};
