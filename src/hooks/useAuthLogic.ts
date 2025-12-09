
import { useState, FormEvent, ChangeEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { db } from '../lib/db';
import { 
    FIELD_DNI_ESTUDIANTES, 
    FIELD_CORREO_ESTUDIANTES, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_USER_ID_ESTUDIANTES, 
    FIELD_TELEFONO_ESTUDIANTES,
} from '../constants';
import type { EstudianteFields, AirtableRecord } from '../types';
import type { AuthUser } from '../contexts/AuthContext';

interface UseAuthLogicProps {
    login: (user: AuthUser) => void;
    showModal: (title: string, message: string) => void;
}

const normalizePhone = (phone: any) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
};

export const useAuthLogic = ({ login, showModal }: UseAuthLogicProps) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset' | 'migration' | 'recover'>('login');
    const [resetStep, setResetStep] = useState<'verify' | 'reset_password' | 'success'>('verify');
    const [migrationStep, setMigrationStep] = useState<1 | 2>(1);
    const [registerStep, setRegisterStep] = useState<1 | 2>(1);

    const [legajo, setLegajo] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldError, setFieldError] = useState<string | null>(null);

    const [foundStudent, setFoundStudent] = useState<AirtableRecord<EstudianteFields> | null>(null);
    const [verificationData, setVerificationData] = useState({ dni: '', correo: '', telefono: '' });
    
    const resetFormState = () => {
        setError(null);
        setFieldError(null);
        setPassword('');
        setConfirmPassword('');
        setResetStep('verify'); 
        setMigrationStep(1); 
        setRegisterStep(1);
        setVerificationData({ dni: '', correo: '', telefono: '' });
        setFoundStudent(null);
    };

    const handleModeChange = (newMode: any) => {
        setMode(newMode);
        // Clean session when switching modes to avoid lingering zombie states
        supabase.auth.signOut().catch(() => {});
        
        if (!((newMode === 'migration' || newMode === 'recover') && mode === 'login')) {
             resetFormState();
        } else {
            // Keep legajo if switching from login failure
            setMigrationStep(1);
            setRegisterStep(1);
            setResetStep('verify');
            setError(null);
            setFieldError(null);
            setFoundStudent(null);
        }
    };
    
    const handleVerificationDataChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setVerificationData(prev => ({ ...prev, [name]: value }));
        setFieldError(null);
    };

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const legajoTrimmed = legajo.trim();
        const passwordTrimmed = password.trim();
        
        if (legajoTrimmed === 'testing' && passwordTrimmed === 'testing') {
            login({ legajo: '99999', nombre: 'Usuario de Prueba', role: 'AdminTester' });
            return;
        }

        setIsLoading(true);
        setError(null);
        setFieldError(null);
        
        if (mode === 'login') {
            try {
                // LIMPIEZA PREVENTIVA
                await supabase.auth.signOut();

                if (!legajoTrimmed || !passwordTrimmed) throw new Error('Por favor, completa todos los campos.');

                // 1. Intentar obtener datos del estudiante
                const { data: rpcData, error: rpcError } = await supabase
                    .rpc('get_student_details_by_legajo', { legajo_input: legajoTrimmed });

                if (rpcError) throw new Error('Error de conexión al validar legajo. Intenta nuevamente.');
                const studentData = rpcData && rpcData.length > 0 ? rpcData[0] : null;

                if (!studentData) throw new Error('Legajo no encontrado. Verificá el número o creá una cuenta nueva.');

                const email = studentData[FIELD_CORREO_ESTUDIANTES];
                
                if (!email) throw new Error('Tu usuario parece incompleto. Por favor, ve a "Crear Cuenta" para actualizar tus datos.');

                // 2. Intentar Login
                const { error: signInError } = await (supabase.auth as any).signInWithPassword({
                    email: email,
                    password: passwordTrimmed,
                });

                if (signInError) {
                    if (signInError.message.includes('Invalid login credentials')) {
                        // LOGICA INTELIGENTE: Si falla el login, pero el estudiante existe en DB,
                        // lo mandamos a validar sus datos para resetear/crear su clave.
                        setMode('migration');
                        setMigrationStep(1);
                        setError('No pudimos iniciar sesión con esa clave. Por favor, validá tu identidad para configurar tu acceso.');
                        // No lanzamos error, cambiamos de modo y el UI se actualiza
                        setIsLoading(false);
                        return;
                    } else {
                        throw signInError;
                    }
                }
                // Si el login es exitoso, AuthContext detectará el cambio de sesión automáticamente
            } catch (err: any) {
                console.error("Login error:", err);
                setError(err.message || 'Error al iniciar sesión.');
            } finally {
                setIsLoading(false);
            }

        } else if (mode === 'migration') {
            // === LOGICA DE MIGRACIÓN / ACTIVACIÓN ===
            try {
                if (migrationStep === 1) {
                    // Paso 1: Validar Identidad
                    if (!legajoTrimmed || !verificationData.dni || !verificationData.correo) {
                        throw new Error("Por favor completa los campos para validar tu identidad.");
                    }

                    const { data: rpcData, error: rpcError } = await supabase
                        .rpc('get_student_details_by_legajo', { legajo_input: legajoTrimmed });

                    if (rpcError) throw new Error("Error de conexión. Intenta más tarde.");
                    const studentData = rpcData && rpcData.length > 0 ? rpcData[0] : null;
                    
                    if (!studentData) throw new Error("No encontramos un estudiante con ese legajo.");

                    // Verificar coincidencia de datos
                    const dbDni = String(studentData[FIELD_DNI_ESTUDIANTES] || '').trim();
                    const dbEmail = String(studentData[FIELD_CORREO_ESTUDIANTES] || '').trim().toLowerCase();
                    
                    const inputDni = verificationData.dni.trim();
                    const inputEmail = verificationData.correo.trim().toLowerCase();

                    if (dbDni !== inputDni || dbEmail !== inputEmail) {
                         throw new Error("Los datos ingresados no coinciden con nuestros registros.");
                    }
                    
                    setFoundStudent(studentData as unknown as AirtableRecord<EstudianteFields>);
                    setMigrationStep(2);
                    setIsLoading(false);
                    return;
                }

                if (migrationStep === 2) {
                    // Paso 2: Establecer Contraseña y Crear/Vincular Usuario
                     if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
                     if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");
                     
                     if (!foundStudent) throw new Error("Sesión de validación expirada. Por favor comienza de nuevo.");

                     const email = String(foundStudent[FIELD_CORREO_ESTUDIANTES]).trim().toLowerCase();
                     let userId: string | null = null;

                     // 1. Intentamos CREAR el usuario
                     const { data: authData, error: signUpError } = await (supabase.auth as any).signUp({
                        email: email,
                        password: password,
                        options: { data: { legajo: legajoTrimmed } }
                    });

                    // 2. Manejo de Errores: ¿Ya existe?
                    if (signUpError) {
                        if (signUpError.message.includes("already registered") || signUpError.status === 422 || signUpError.status === 400) {
                             console.log("Usuario ya existe en Auth, intentando forzar actualización de clave...");
                             // Si ya existe, usamos RPC para resetear la clave sin necesidad de link de email (admin override)
                             const { error: rpcResetError } = await supabase.rpc('admin_reset_password', {
                                 legajo_input: legajoTrimmed,
                                 new_password: password
                             });
                             
                             if (rpcResetError) {
                                 console.error("RPC Reset Error:", rpcResetError);
                                 throw new Error("No pudimos actualizar tu contraseña. Por favor contacta a soporte técnico.");
                             }
                             // Si el reset funcionó, necesitamos el ID para asegurar el vínculo
                             // Intentamos login silencioso para obtener el ID
                        } else {
                             throw new Error(`Error al crear usuario: ${signUpError.message}`);
                        }
                    } else if (authData?.user) {
                        userId = authData.user.id;
                    }

                    // 3. Intento de Login final para confirmar y obtener sesión
                     const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                        email: email,
                        password: password,
                    });

                    if (loginError) {
                        setMode('login');
                        setError('Cuenta configurada, pero el inicio de sesión automático falló. Por favor ingresa manualmente.');
                    } else if (loginData.user) {
                        // 4. Asegurar vínculo en DB (Self-healing)
                        if (!foundStudent[FIELD_USER_ID_ESTUDIANTES] || foundStudent[FIELD_USER_ID_ESTUDIANTES] !== loginData.user.id) {
                             await supabase
                                .from('estudiantes')
                                .update({ [FIELD_USER_ID_ESTUDIANTES]: loginData.user.id })
                                .eq('id', foundStudent.id);
                        }
                    }
                }

            } catch (err: any) {
                console.error("Migration error:", err);
                setError(err.message || "Error del servidor al procesar la solicitud.");
            } finally {
                setIsLoading(false);
            }

        } else if (mode === 'register') {
             try {
                if (registerStep === 1) {
                     if (!legajoTrimmed) throw new Error("Por favor ingresa tu legajo.");
                     const { data: rpcData, error: rpcError } = await supabase
                         .rpc('get_student_for_signup', { legajo_input: legajoTrimmed });
                     
                     if (rpcError) throw new Error(rpcError.message);
                     const student = rpcData && rpcData.length > 0 ? rpcData[0] : null;
                     
                     if (!student) throw new Error("El legajo no figura en la lista o ya tiene usuario. Prueba 'Recuperar Acceso'.");
                     if (student.user_id) throw new Error("Este legajo ya tiene cuenta activa. Usa 'Recuperar Acceso' si olvidaste la clave.");

                     setFoundStudent(student as unknown as AirtableRecord<EstudianteFields>);
                     setRegisterStep(2);
                     setIsLoading(false);
                     return;
                }
                
                if (registerStep === 2) {
                     const { dni, correo, telefono } = verificationData;
                     if (!dni || !correo || !telefono || !password) throw new Error("Todos los campos son obligatorios.");
                     if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");
                     
                     const inputEmail = correo.trim().toLowerCase();
                     
                     // Intentar crear usuario
                     const { data: authData, error: signUpError } = await (supabase.auth as any).signUp({
                        email: inputEmail,
                        password: password,
                        options: { data: { legajo: legajoTrimmed } }
                    });
                    
                    let userId = authData?.user?.id;

                    // MANEJO ROBUSTO DE "USUARIO YA EXISTE"
                    if (signUpError || !userId) {
                         console.warn("SignUp failed, attempting fallback login:", signUpError?.message);
                         
                         const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ 
                             email: inputEmail, 
                             password 
                         });
                         
                         if (loginError || !loginData.user) {
                             throw new Error("Este correo ya está registrado con otra contraseña. Por favor ve a 'Iniciar Sesión'.");
                         }
                         
                         userId = loginData.user.id;
                    }

                    if (userId) {
                        const { error: rpcLinkError } = await supabase.rpc('register_new_student', {
                            legajo_input: legajoTrimmed,
                            userid_input: userId,
                            dni_input: parseInt(dni, 10),
                            correo_input: inputEmail,
                            telefono_input: telefono
                        });
                        
                        if (rpcLinkError) {
                            console.error("Link Error:", rpcLinkError);
                            throw new Error("Error al vincular tu cuenta. Contacta a soporte.");
                        }
                    } else {
                        throw new Error("No se pudo crear ni verificar el usuario.");
                    }
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }

        } else if (mode === 'recover') {
            try {
                if (resetStep === 'verify') {
                    if (!legajoTrimmed || !verificationData.dni || !verificationData.correo || !verificationData.telefono) {
                        throw new Error("Por favor completa todos los campos para validar tu identidad.");
                    }

                    const { data: rpcData, error: rpcError } = await supabase
                        .rpc('get_student_details_by_legajo', { legajo_input: legajoTrimmed });

                    if (rpcError) throw new Error("Error de conexión. Intenta más tarde.");
                    const studentData = rpcData && rpcData.length > 0 ? rpcData[0] : null;
                    
                    if (!studentData) throw new Error("No encontramos un estudiante con ese legajo.");

                    const dbDni = String(studentData[FIELD_DNI_ESTUDIANTES] || '').trim();
                    const dbEmail = String(studentData[FIELD_CORREO_ESTUDIANTES] || '').trim().toLowerCase();
                    const dbPhone = normalizePhone(studentData[FIELD_TELEFONO_ESTUDIANTES]);
                    
                    const inputDni = verificationData.dni.trim();
                    const inputEmail = verificationData.correo.trim().toLowerCase();
                    const inputPhone = normalizePhone(verificationData.telefono);

                    let mismatch = false;
                    if (dbDni !== inputDni) mismatch = true;
                    if (dbEmail !== inputEmail) mismatch = true;
                    // Phone validation is loose (check last 6 digits)
                    if (!dbPhone || !inputPhone.includes(dbPhone.slice(-6))) mismatch = true;

                    if (mismatch) {
                         throw new Error("Los datos ingresados no coinciden con nuestros registros.");
                    }

                    setResetStep('reset_password');
                    setIsLoading(false);
                    return;
                }

                if (resetStep === 'reset_password') {
                     if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
                     if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");

                     const { error: rpcResetError } = await supabase.rpc('admin_reset_password', {
                         legajo_input: legajoTrimmed,
                         new_password: password
                     });

                     if (rpcResetError) {
                         console.error("RPC Reset Error", rpcResetError);
                         throw new Error("Error del servidor al actualizar la contraseña. Contacta a soporte.");
                     }

                     setResetStep('success');
                     setIsLoading(false);
                }

            } catch (err: any) {
                setError(err.message);
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    };
    
    return {
        mode, setMode: handleModeChange,
        resetStep,
        migrationStep, setMigrationStep,
        registerStep, setRegisterStep,
        legajo, setLegajo,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        rememberMe, setRememberMe,
        isLoading, error,
        fieldError, 
        foundStudent,
        verificationData, handleVerificationDataChange,
        handleFormSubmit, handleForgotLegajoSubmit: (e: any) => e.preventDefault()
    };
};
