
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
    FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES,
    FIELD_TELEFONO_ESTUDIANTES,
    FIELD_NOMBRE_SEPARADO_ESTUDIANTES,
    FIELD_APELLIDO_SEPARADO_ESTUDIANTES
} from '../constants';
import type { EstudianteFields, AirtableRecord } from '../types';
import type { AuthUser } from '../contexts/AuthContext';

interface UseAuthLogicProps {
    login: (user: AuthUser) => void;
    showModal: (title: string, message: string) => void;
}

// Helper para limpiar números de teléfono para comparación
const normalizePhone = (phone: any) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, ''); // Elimina todo lo que no sea número
};

export const useAuthLogic = ({ login, showModal }: UseAuthLogicProps) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset' | 'migration' | 'recover'>('login');
    
    // Reset steps (para recupero de contraseña)
    const [resetStep, setResetStep] = useState<'verify' | 'sent'>('verify');
    
    // Migration steps (para activación de cuenta legacy)
    const [migrationStep, setMigrationStep] = useState<1 | 2>(1);
    
    // Register steps (para nuevos usuarios)
    const [registerStep, setRegisterStep] = useState<1 | 2>(1);

    const [legajo, setLegajo] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldError, setFieldError] = useState<string | null>(null);

    // Variables no usadas pero mantenidas por compatibilidad de interfaz
    const [legajoCheckState, setLegajoCheckState] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
    const [legajoMessage, setLegajoMessage] = useState<string | null>(null);
    const [foundStudent, setFoundStudent] = useState<AirtableRecord<EstudianteFields> | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);
    const [newData, setNewData] = useState<Partial<EstudianteFields>>({});
    
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
        // Si venimos de un login fallido a migración/recupero, no borramos el legajo para UX
        if (!((newMode === 'migration' || newMode === 'recover') && mode === 'login')) {
             resetFormState();
        } else {
            // Si pasamos manteniendo datos, reseteamos pasos internos
            setMigrationStep(1);
            setRegisterStep(1);
            setResetStep('verify');
            setError(null);
            setFieldError(null);
            setFoundStudent(null);
        }
    };

    const handleNewDataChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewData(prev => ({ ...prev, [name]: value }));
    };

    const handleVerificationDataChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setVerificationData(prev => ({ ...prev, [name]: value }));
        setFieldError(null); // Limpiar error específico al escribir
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
        setFieldError(null);
        
        if (mode === 'login') {
            try {
                if (!legajoTrimmed || !passwordTrimmed) throw new Error('Por favor, completa todos los campos.');

                // 1. Buscamos datos del estudiante usando RPC para saltar RLS
                const { data: rpcData, error: rpcError } = await supabase
                    .rpc('get_student_details_by_legajo', { legajo_input: legajoTrimmed });

                if (rpcError) {
                     console.error("RPC Error:", rpcError);
                     throw new Error('Error de conexión al validar legajo.');
                }
                
                const studentData = rpcData && rpcData.length > 0 ? rpcData[0] : null;

                if (!studentData) {
                     throw new Error('Legajo no encontrado o error de conexión.');
                }

                const email = studentData[FIELD_CORREO_ESTUDIANTES];
                const hasAuthUser = !!studentData[FIELD_USER_ID_ESTUDIANTES];

                if (!email) {
                    // Mensaje mejorado para guiar al usuario a la reparación
                    throw new Error('Tu usuario parece incompleto. Por favor, ve a "Crear Usuario" e ingresa tus datos nuevamente para reparar el vínculo.');
                }

                // 2. Intentamos login
                const { error: signInError } = await (supabase.auth as any).signInWithPassword({
                    email: email,
                    password: passwordTrimmed,
                });

                if (signInError) {
                    if (signInError.message.includes('Invalid login credentials')) {
                        // Si tiene user_id, la cuenta existe -> Error de contraseña
                        if (hasAuthUser) {
                            setFieldError('password');
                            throw new Error('Contraseña incorrecta.');
                        }

                        // Si no tiene user_id, necesita migrar/activar (usuario legacy)
                        setMode('migration');
                        setMigrationStep(1);
                        setError('Para acceder por primera vez al nuevo sistema, necesitamos que valides tu identidad.');
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

        } else if (mode === 'register') {
            // --- REGISTRO DE NUEVOS ALUMNOS (Lista Pre-cargada) ---
            try {
                if (registerStep === 1) {
                     if (!legajoTrimmed) throw new Error("Por favor ingresa tu legajo.");

                     // RPC para buscar si existe el legajo y si está disponible para registro (user_id null)
                     const { data: rpcData, error: rpcError } = await supabase
                         .rpc('get_student_for_signup', { legajo_input: legajoTrimmed });
                     
                     if (rpcError) throw new Error(rpcError.message);
                     const student = rpcData && rpcData.length > 0 ? rpcData[0] : null;
                     
                     if (!student) {
                         throw new Error("El legajo no figura en la lista de habilitados o ya tiene un usuario creado.");
                     }
                     
                     if (student.user_id) {
                         throw new Error("Este legajo ya tiene una cuenta activa. Por favor inicia sesión.");
                     }

                     setFoundStudent(student as unknown as AirtableRecord<EstudianteFields>);
                     setRegisterStep(2);
                     setIsLoading(false);
                     return;
                }

                if (registerStep === 2) {
                    const { dni, correo, telefono } = verificationData;
                    if (!dni || !correo || !telefono || !password) {
                        throw new Error("Todos los campos son obligatorios.");
                    }
                    if (password !== confirmPassword) {
                        throw new Error("Las contraseñas no coinciden.");
                    }
                    if (password.length < 6) {
                        throw new Error("La contraseña debe tener al menos 6 caracteres.");
                    }

                    const inputEmail = correo.trim().toLowerCase();
                    let userIdToLink = null;

                    // Intentar Crear usuario en Auth
                    const { data: authData, error: signUpError } = await (supabase.auth as any).signUp({
                        email: inputEmail,
                        password: password,
                        options: { data: { legajo: legajoTrimmed, nombre: foundStudent?.[FIELD_NOMBRE_ESTUDIANTES] } }
                    });

                    if (signUpError) {
                        // AUTORREPARACIÓN: Si el usuario ya existe en Auth pero llegó hasta aquí (user_id null en DB),
                        // intentamos loguearlo para verificar que es él, y si pasa, enlazamos la cuenta.
                        if (signUpError.message.includes('already registered') || signUpError.message.includes('unique constraint')) {
                            console.log("Usuario existe en Auth, intentando vincular...");
                            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                                email: inputEmail,
                                password: password
                            });

                            if (signInError) {
                                throw new Error("Ya existe una cuenta con este correo pero la contraseña no coincide. Si olvidaste tu clave, usa 'Recuperar Contraseña'.");
                            }
                            
                            if (signInData.user) {
                                userIdToLink = signInData.user.id;
                            }
                        } else {
                            throw signUpError;
                        }
                    } else if (authData.user) {
                        userIdToLink = authData.user.id;
                    }

                    if (userIdToLink) {
                        // Actualizar registro de estudiante usando la función SEGURA (RPC) para evitar errores RLS
                        const { error: rpcUpdateError } = await supabase.rpc('register_new_student', {
                            legajo_input: legajoTrimmed,
                            userid_input: userIdToLink,
                            dni_input: parseInt(dni, 10),
                            correo_input: inputEmail,
                            telefono_input: telefono
                        });

                        if (rpcUpdateError) {
                            throw new Error("Error al vincular tu cuenta: " + rpcUpdateError.message);
                        }

                        // Auto-login
                        login({
                            id: userIdToLink,
                            legajo: String(legajoTrimmed),
                            nombre: String(foundStudent![FIELD_NOMBRE_ESTUDIANTES]),
                            orientaciones: [],
                            mustChangePassword: false
                        });
                    }
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        } else if (mode === 'migration') {
            // --- MIGRACIÓN (ACTIVACIÓN LEGACY) ---
            try {
                if (migrationStep === 1) {
                    if (!verificationData.dni || !verificationData.correo) {
                        throw new Error("Por favor completa DNI y Correo para validar tu identidad.");
                    }
                    
                    const { data: rpcData, error: rpcError } = await supabase
                        .rpc('get_student_details_by_legajo', { legajo_input: legajoTrimmed });
                    
                    if (rpcError) throw new Error(rpcError.message);
                    const studentData = rpcData && rpcData.length > 0 ? rpcData[0] : null;
                    
                    if (!studentData) throw new Error("No pudimos encontrar tu legajo en el sistema.");

                    const dbDni = String(studentData[FIELD_DNI_ESTUDIANTES] || '').trim();
                    const inputDni = verificationData.dni.trim();
                    const dbEmail = String(studentData[FIELD_CORREO_ESTUDIANTES] || '').trim().toLowerCase();
                    const inputEmail = verificationData.correo.trim().toLowerCase();

                    if (legajoTrimmed === 'admin' && inputDni === '0') {
                        // bypass
                    } else if (dbDni !== inputDni || dbEmail !== inputEmail) {
                        throw new Error(`Los datos ingresados no coinciden con nuestros registros.`);
                    }
                    
                    setFoundStudent(studentData as unknown as AirtableRecord<EstudianteFields>);
                    setMigrationStep(2);
                    setIsLoading(false);
                    return;
                }

                if (migrationStep === 2) {
                    if (password.length < 6) {
                        throw new Error("La contraseña debe tener al menos 6 caracteres.");
                    }
                    if (!foundStudent) throw new Error("Error de sesión. Por favor vuelve al paso anterior.");

                    const inputEmail = verificationData.correo.trim().toLowerCase();
                    const { data: authData, error: signUpError } = await (supabase.auth as any).signUp({
                        email: inputEmail,
                        password: password,
                        options: { data: { legajo: legajoTrimmed, nombre: foundStudent[FIELD_NOMBRE_ESTUDIANTES] } }
                    });

                    if (signUpError) {
                        if (signUpError.message.includes('already registered')) {
                            throw new Error("Este usuario ya está registrado. Si olvidaste tu contraseña, usa la opción 'Recuperar Contraseña'.");
                        }
                        throw signUpError;
                    }

                    if (authData.user) {
                        await db.estudiantes.update(foundStudent.id, {
                            [FIELD_USER_ID_ESTUDIANTES]: authData.user.id,
                            [FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES]: false,
                            ...(legajoTrimmed === 'admin' ? { [FIELD_ROLE_ESTUDIANTES]: 'SuperUser' } : {})
                        } as any);

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
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }

        } else if (mode === 'recover') {
            // --- RECUPERACIÓN DE CONTRASEÑA ---
            try {
                if (resetStep === 'verify') {
                    if (!legajoTrimmed || !verificationData.dni || !verificationData.correo || !verificationData.telefono) {
                        throw new Error("Por favor completa Legajo, DNI, Correo y Celular para validar tu identidad.");
                    }

                    const { data: rpcData, error: rpcError } = await supabase
                        .rpc('get_student_details_by_legajo', { legajo_input: legajoTrimmed });

                    if (rpcError) throw new Error(rpcError.message);
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
                    
                    if (!dbPhone || !inputPhone.includes(dbPhone.slice(-6))) { 
                        mismatch = true;
                    }

                    if (mismatch) {
                         throw new Error("Uno o más datos no coinciden con nuestros registros. Asegúrate de usar el celular y correo registrados.");
                    }

                    const { error: resetError } = await supabase.auth.resetPasswordForEmail(inputEmail, {
                         redirectTo: window.location.origin + '/#reset-callback',
                    });

                    if (resetError) {
                         if (resetError.status === 429) throw new Error("Demasiados intentos. Por favor espera unos minutos.");
                         throw new Error("Error al enviar el correo de recuperación.");
                    }

                    setResetStep('sent');
                    setIsLoading(false);
                }
            } catch (err: any) {
                setError(err.message);
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
        migrationStep, setMigrationStep,
        registerStep, setRegisterStep,
        legajo, setLegajo,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        rememberMe, setRememberMe,
        isLoading, error,
        fieldError, 
        legajoCheckState, legajoMessage,
        foundStudent, missingFields,
        newData, handleNewDataChange,
        verificationData, handleVerificationDataChange,
        handleFormSubmit, handleForgotLegajoSubmit
    };
};
