
import { useState, FormEvent, ChangeEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { db } from '../lib/db';
import { 
    FIELD_DNI_ESTUDIANTES, 
    FIELD_CORREO_ESTUDIANTES, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, 
    FIELD_USER_ID_ESTUDIANTES, 
    FIELD_ROLE_ESTUDIANTES,
<<<<<<< HEAD
    FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES,
    FIELD_TELEFONO_ESTUDIANTES
=======
    FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
} from '../constants';
import type { EstudianteFields, AirtableRecord } from '../types';
import type { AuthUser } from '../contexts/AuthContext';

<<<<<<< HEAD
=======

>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
interface UseAuthLogicProps {
    login: (user: AuthUser) => void;
    showModal: (title: string, message: string) => void;
}

<<<<<<< HEAD
// Helper para limpiar números de teléfono para comparación
const normalizePhone = (phone: any) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, ''); // Elimina todo lo que no sea número
};

export const useAuthLogic = ({ login, showModal }: UseAuthLogicProps) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset' | 'migration' | 'recover'>('login');
    
    // Reset steps (para recupero de contraseña)
    const [resetStep, setResetStep] = useState<'verify' | 'sent'>('verify');
=======
export const useAuthLogic = ({ login, showModal }: UseAuthLogicProps) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset' | 'migration'>('login');
    
    // Reset steps (para recupero de contraseña)
    const [resetStep, setResetStep] = useState<'verify' | 'setPassword'>('verify');
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
    
    // Migration steps (para activación de cuenta)
    const [migrationStep, setMigrationStep] = useState<1 | 2>(1);
    
    const [legajo, setLegajo] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
<<<<<<< HEAD
    const [fieldError, setFieldError] = useState<string | null>(null);
=======
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc

    // Variables no usadas pero mantenidas por compatibilidad de interfaz
    const [legajoCheckState, setLegajoCheckState] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
    const [legajoMessage, setLegajoMessage] = useState<string | null>(null);
    const [foundStudent, setFoundStudent] = useState<AirtableRecord<EstudianteFields> | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);
    const [newData, setNewData] = useState<Partial<EstudianteFields>>({});
    
    const [verificationData, setVerificationData] = useState({ dni: '', correo: '', telefono: '' });
    
    const resetFormState = () => {
        setError(null);
<<<<<<< HEAD
        setFieldError(null);
=======
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
        setPassword('');
        setConfirmPassword('');
        setResetStep('verify'); 
        setMigrationStep(1); // Resetear paso de migración
        setVerificationData({ dni: '', correo: '', telefono: '' });
    };

    const handleModeChange = (newMode: any) => {
        setMode(newMode);
<<<<<<< HEAD
        // Si venimos de un login fallido a migración/recupero, no borramos el legajo para UX
        if (!((newMode === 'migration' || newMode === 'recover') && mode === 'login')) {
             resetFormState();
        } else {
            // Si pasamos manteniendo datos, reseteamos pasos internos
            setMigrationStep(1);
            setResetStep('verify');
            setError(null);
            setFieldError(null);
=======
        // Si venimos de un login fallido a migración, no borramos el legajo para UX
        if (!(newMode === 'migration' && mode === 'login')) {
             resetFormState();
        } else {
            // Si pasamos a migración manteniendo datos, nos aseguramos de estar en el paso 1
            setMigrationStep(1);
            setError(null);
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
        }
    };

    const handleNewDataChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewData(prev => ({ ...prev, [name]: value }));
    };

    const handleVerificationDataChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setVerificationData(prev => ({ ...prev, [name]: value }));
<<<<<<< HEAD
        setFieldError(null); // Limpiar error específico al escribir
=======
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
    };

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const legajoTrimmed = legajo.trim();
        const passwordTrimmed = password.trim();
        
        // --- MODO DE PRUEBA ---
        if (legajoTrimmed === 'testing' && passwordTrimmed === 'testing') {
            login({ legajo: '99999', nombre: 'Usuario de Prueba', role: 'AdminTester' });
            return;
        }

        setIsLoading(true);
        setError(null);
<<<<<<< HEAD
        setFieldError(null);
=======
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
        
        if (mode === 'login') {
            try {
                if (!legajoTrimmed || !passwordTrimmed) throw new Error('Por favor, completa todos los campos.');

<<<<<<< HEAD
                // 1. Buscamos datos del estudiante
=======
                // 1. Buscamos datos del estudiante directamente para verificar estado
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
                const { data: studentData, error: dbError } = await supabase
                    .from('estudiantes')
                    .select(`${FIELD_CORREO_ESTUDIANTES}, ${FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES}, ${FIELD_USER_ID_ESTUDIANTES}`)
                    .eq(FIELD_LEGAJO_ESTUDIANTES, legajoTrimmed)
                    .maybeSingle();

                if (dbError || !studentData) {
                     throw new Error('Legajo no encontrado o error de conexión.');
                }

                const email = studentData[FIELD_CORREO_ESTUDIANTES];
<<<<<<< HEAD
=======
                // Si es null, asumimos true (necesita cambio) para forzar migración la primera vez
                const mustChangePassword = studentData[FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES] !== false; 
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
                const hasAuthUser = !!studentData[FIELD_USER_ID_ESTUDIANTES];

                if (!email) {
                     throw new Error('Tu legajo no tiene un correo asociado. Contacta a soporte.');
                }

<<<<<<< HEAD
                // 2. Intentamos login
=======
                // 2. Intentamos login normal
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
                const { error: signInError } = await (supabase.auth as any).signInWithPassword({
                    email: email,
                    password: passwordTrimmed,
                });

                if (signInError) {
                    if (signInError.message.includes('Invalid login credentials')) {
<<<<<<< HEAD
                        // Si tiene user_id, la cuenta existe -> Error de contraseña
                        if (hasAuthUser) {
                            setFieldError('password');
                            throw new Error('Contraseña incorrecta.');
                        }

                        // Si no tiene user_id, necesita migrar/activar
                        setMode('migration');
                        setMigrationStep(1);
                        setError('Para acceder por primera vez al nuevo sistema, necesitamos que valides tu identidad.');
=======
                        
                        // LÓGICA INTELIGENTE:
                        // Si el usuario YA tiene usuario de Auth (hasAuthUser) Y ya cambió su contraseña (mustChangePassword === false),
                        // entonces es simplemente que se olvidó la contraseña o la puso mal. NO mandarlo a validar identidad.
                        if (hasAuthUser && !mustChangePassword) {
                            throw new Error('Contraseña incorrecta.');
                        }

                        // Si no, asumimos que es un usuario legacy o que necesita migrar/activar
                        setMode('migration');
                        setMigrationStep(1); // Asegurar paso 1
                        setError('Por mejoras de seguridad, es necesario que valides tu identidad y configures una nueva contraseña.');
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
                    } else {
                        throw signInError;
                    }
                }
                
            } catch (err: any) {
                console.error("Login error:", err);
                setError(err.message || 'Error al iniciar sesión.');
            } finally {
                setIsLoading(false);
            }
<<<<<<< HEAD

        } else if (mode === 'migration') {
            // --- MIGRACIÓN (ACTIVACIÓN) ---
            try {
=======
        } else if (mode === 'migration') {
            // --- LÓGICA DE MIGRACIÓN / ACTIVACIÓN (2 PASOS) ---
            try {
                // PASO 1: VALIDAR IDENTIDAD
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
                if (migrationStep === 1) {
                    if (!verificationData.dni || !verificationData.correo) {
                        throw new Error("Por favor completa DNI y Correo para validar tu identidad.");
                    }
<<<<<<< HEAD
=======

                    // Verificar datos contra la base de datos
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
                    const [studentData] = await db.estudiantes.get({ filters: { [FIELD_LEGAJO_ESTUDIANTES]: legajoTrimmed } });
                    
                    if (!studentData) throw new Error("No pudimos encontrar tu legajo en el sistema.");

                    const dbDni = String(studentData[FIELD_DNI_ESTUDIANTES] || '').trim();
                    const inputDni = verificationData.dni.trim();
                    const dbEmail = String(studentData[FIELD_CORREO_ESTUDIANTES] || '').trim().toLowerCase();
                    const inputEmail = verificationData.correo.trim().toLowerCase();
<<<<<<< HEAD

                    // Admin override or validation
                    if (legajoTrimmed === 'admin' && inputDni === '0') {
                        // bypass
                    } else if (dbDni !== inputDni || dbEmail !== inputEmail) {
                        throw new Error(`Los datos ingresados no coinciden con nuestros registros.`);
                    }
                    
=======
                    
                    // Debugging Logs
                    console.log("[AUTH DEBUG]", {
                        legajo: legajoTrimmed,
                        dbDni, inputDni,
                        dbEmail, inputEmail,
                        isAdmin: legajoTrimmed === 'admin'
                    });

                    // Validación: Permitimos pase libre al admin si el DNI ingresado es 0, ignorando el mail por ahora para facilitar acceso
                    if (legajoTrimmed === 'admin' && inputDni === '0') {
                        // Admin pass: Confiamos si pone DNI 0, ya que es un dato interno conocido.
                        console.log("Admin override active.");
                    } else if (dbDni !== inputDni || dbEmail !== inputEmail) {
                        throw new Error(`Los datos ingresados no coinciden. (DNI DB: ${dbDni}, Email DB: ${dbEmail})`);
                    }
                    
                    // Si todo ok, guardamos los datos del estudiante encontrado y avanzamos
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
                    setFoundStudent(studentData);
                    setMigrationStep(2);
                    setIsLoading(false);
                    return;
                }

<<<<<<< HEAD
=======
                // PASO 2: CREAR CUENTA
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
                if (migrationStep === 2) {
                    if (password.length < 6) {
                        throw new Error("La contraseña debe tener al menos 6 caracteres.");
                    }
<<<<<<< HEAD
                    if (!foundStudent) throw new Error("Error de sesión. Por favor vuelve al paso anterior.");

                    const inputEmail = verificationData.correo.trim().toLowerCase();
                    const { data: authData, error: signUpError } = await (supabase.auth as any).signUp({
                        email: inputEmail,
                        password: password,
                        options: { data: { legajo: legajoTrimmed, nombre: foundStudent[FIELD_NOMBRE_ESTUDIANTES] } }
                    });

                    if (signUpError) {
                        if (signUpError.message.includes('already registered')) {
                            // Si ya existe, redirigir a recupero si es necesario
                            throw new Error("Este usuario ya está registrado. Si olvidaste tu contraseña, usa la opción 'Recuperar Contraseña'.");
=======

                    if (!foundStudent) throw new Error("Error de sesión. Por favor vuelve al paso anterior.");

                    const inputEmail = verificationData.correo.trim().toLowerCase();

                    // Crear Usuario en Supabase (Sign Up)
                    // Si el usuario ya existe en Auth (pero no estaba vinculado o fallaba), esto podría dar error,
                    // pero en ese caso solemos usar updateUser si estuviéramos logueados. 
                    // Como estamos "fuera", asumimos SignUp. Si dice "already registered", intentamos un "recovery" implícito o instruimos al usuario.
                    const { data: authData, error: signUpError } = await (supabase.auth as any).signUp({
                        email: inputEmail,
                        password: password,
                        options: {
                            data: {
                                legajo: legajoTrimmed,
                                nombre: foundStudent[FIELD_NOMBRE_ESTUDIANTES]
                            }
                        }
                    });

                    if (signUpError) {
                        // Si ya existe, significa que el Auth User está creado.
                        // Podríamos intentar un 'update' si tuviéramos privilegios, pero no los tenemos anonimamente.
                        // Lo correcto aquí es decirle al usuario que el usuario ya existe.
                        // PERO, dado que estamos en el flujo de "Validación de Identidad Exitosa",
                        // significa que el usuario probó que ES él.
                        // Podríamos forzar un "Password Reset" trigger aquí si tuviéramos la API, 
                        // pero por ahora manejamos el error.
                        if (signUpError.message.includes('already registered')) {
                             // Edge case: Admin user might exist.
                             if (legajoTrimmed === 'admin') {
                                 throw new Error("El usuario ya existe. Intenta iniciar sesión directamente.");
                             }
                            throw new Error("Este usuario ya está registrado en el sistema de autenticación. Contacta a soporte para un blanqueo de clave.");
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
                        }
                        throw signUpError;
                    }

                    if (authData.user) {
<<<<<<< HEAD
                        await db.estudiantes.update(foundStudent.id, {
                            [FIELD_USER_ID_ESTUDIANTES]: authData.user.id,
                            [FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES]: false,
                            ...(legajoTrimmed === 'admin' ? { [FIELD_ROLE_ESTUDIANTES]: 'SuperUser' } : {})
                        } as any);

=======
                        // Vincular el nuevo ID de usuario a la tabla de estudiantes
                        // Y MARCAR QUE YA CAMBIÓ LA CONTRASEÑA (must_change_password = false)
                        await db.estudiantes.update(foundStudent.id, {
                            [FIELD_USER_ID_ESTUDIANTES]: authData.user.id,
                            [FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES]: false, // Importante: Ya la definió aquí
                            // Actualizar rol si es admin
                            ...(legajoTrimmed === 'admin' ? { [FIELD_ROLE_ESTUDIANTES]: 'SuperUser' } : {})
                        } as any);

                        // Iniciar sesión automáticamente
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
                        login({
                            id: authData.user.id,
                            legajo: String(foundStudent[FIELD_LEGAJO_ESTUDIANTES]),
                            nombre: String(foundStudent[FIELD_NOMBRE_ESTUDIANTES]),
                            orientaciones: foundStudent[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] ? [String(foundStudent[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES])] : [],
                            role: legajoTrimmed === 'admin' ? 'SuperUser' : undefined,
                            mustChangePassword: false
                        });
                    }
                }
<<<<<<< HEAD
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }

        } else if (mode === 'recover') {
            // --- RECUPERACIÓN DE CONTRASEÑA (CON TRIPLE VALIDACIÓN) ---
            try {
                if (resetStep === 'verify') {
                    // 1. Validar campos completos
                    if (!legajoTrimmed || !verificationData.dni || !verificationData.correo || !verificationData.telefono) {
                        throw new Error("Por favor completa Legajo, DNI, Correo y Celular para validar tu identidad.");
                    }

                    // 2. Buscar datos en DB
                    const [studentData] = await db.estudiantes.get({ filters: { [FIELD_LEGAJO_ESTUDIANTES]: legajoTrimmed } });
                    
                    if (!studentData) throw new Error("No encontramos un estudiante con ese legajo.");

                    // 3. Comparación estricta
                    const dbDni = String(studentData[FIELD_DNI_ESTUDIANTES] || '').trim();
                    const dbEmail = String(studentData[FIELD_CORREO_ESTUDIANTES] || '').trim().toLowerCase();
                    const dbPhone = normalizePhone(studentData[FIELD_TELEFONO_ESTUDIANTES]);
                    
                    const inputDni = verificationData.dni.trim();
                    const inputEmail = verificationData.correo.trim().toLowerCase();
                    const inputPhone = normalizePhone(verificationData.telefono);

                    let mismatch = false;
                    if (dbDni !== inputDni) mismatch = true;
                    if (dbEmail !== inputEmail) mismatch = true;
                    
                    // Validación de teléfono (si la DB tiene teléfono, debe coincidir; si no tiene, es un problema de datos)
                    if (!dbPhone || !inputPhone.includes(dbPhone.slice(-6))) { 
                        // Comparamos los últimos 6 dígitos para ser flexibles con prefijos
                        mismatch = true;
                    }

                    if (mismatch) {
                         throw new Error("Uno o más datos no coinciden con nuestros registros. Asegúrate de usar el celular y correo registrados.");
                    }

                    // 4. Si validación OK -> Disparar Reset Email de Supabase
                    const { error: resetError } = await supabase.auth.resetPasswordForEmail(inputEmail, {
                         redirectTo: window.location.origin + '/#reset-callback', // O URL base
                    });

                    if (resetError) {
                         // Si dice "Too many requests", avisar
                         if (resetError.status === 429) throw new Error("Demasiados intentos. Por favor espera unos minutos.");
                         throw new Error("Error al enviar el correo de recuperación.");
                    }

                    setResetStep('sent');
                    setIsLoading(false);
                }
            } catch (err: any) {
                setError(err.message);
=======

            } catch (err: any) {
                console.error(err);
                let msg = err.message;
                if (msg.includes('Password should be at least 6 characters')) {
                    msg = "La contraseña debe tener al menos 6 caracteres.";
                }
                setError(msg);
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    };

    const handleForgotLegajoSubmit = async (e: FormEvent) => {
        e.preventDefault();
    };
    
    return {
        mode, setMode: handleModeChange,
        resetStep,
<<<<<<< HEAD
        migrationStep, setMigrationStep,
=======
        migrationStep, setMigrationStep, // Exponemos el paso de migración
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
        legajo, setLegajo,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        rememberMe, setRememberMe,
        isLoading, error,
<<<<<<< HEAD
        fieldError, // Nuevo estado para resaltar inputs específicos
=======
>>>>>>> f22bb5e2c429f50a41112032c45a849d8b353adc
        legajoCheckState, legajoMessage,
        foundStudent, missingFields,
        newData, handleNewDataChange,
        verificationData, handleVerificationDataChange,
        handleFormSubmit, handleForgotLegajoSubmit
    };
};
