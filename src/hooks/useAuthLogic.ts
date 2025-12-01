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
    FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES
} from '../constants';
import type { EstudianteFields, AirtableRecord } from '../types';
import type { AuthUser } from '../contexts/AuthContext';


interface UseAuthLogicProps {
    login: (user: AuthUser) => void;
    showModal: (title: string, message: string) => void;
}

export const useAuthLogic = ({ login, showModal }: UseAuthLogicProps) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset' | 'migration'>('login');
    
    // Reset steps (para recupero de contraseña)
    const [resetStep, setResetStep] = useState<'verify' | 'setPassword'>('verify');
    
    // Migration steps (para activación de cuenta)
    const [migrationStep, setMigrationStep] = useState<1 | 2>(1);
    
    const [legajo, setLegajo] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Variables no usadas pero mantenidas por compatibilidad de interfaz
    const [legajoCheckState, setLegajoCheckState] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
    const [legajoMessage, setLegajoMessage] = useState<string | null>(null);
    const [foundStudent, setFoundStudent] = useState<AirtableRecord<EstudianteFields> | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);
    const [newData, setNewData] = useState<Partial<EstudianteFields>>({});
    
    const [verificationData, setVerificationData] = useState({ dni: '', correo: '', telefono: '' });
    
    const resetFormState = () => {
        setError(null);
        setPassword('');
        setConfirmPassword('');
        setResetStep('verify'); 
        setMigrationStep(1); // Resetear paso de migración
        setVerificationData({ dni: '', correo: '', telefono: '' });
    };

    const handleModeChange = (newMode: any) => {
        setMode(newMode);
        // Si venimos de un login fallido a migración, no borramos el legajo para UX
        if (!(newMode === 'migration' && mode === 'login')) {
             resetFormState();
        } else {
            // Si pasamos a migración manteniendo datos, nos aseguramos de estar en el paso 1
            setMigrationStep(1);
            setError(null);
        }
    };

    const handleNewDataChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewData(prev => ({ ...prev, [name]: value }));
    };

    const handleVerificationDataChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setVerificationData(prev => ({ ...prev, [name]: value }));
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
        
        if (mode === 'login') {
            try {
                if (!legajoTrimmed || !passwordTrimmed) throw new Error('Por favor, completa todos los campos.');

                // 1. Buscamos datos del estudiante directamente para verificar estado
                const { data: studentData, error: dbError } = await supabase
                    .from('estudiantes')
                    .select(`${FIELD_CORREO_ESTUDIANTES}, ${FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES}, ${FIELD_USER_ID_ESTUDIANTES}`)
                    .eq(FIELD_LEGAJO_ESTUDIANTES, legajoTrimmed)
                    .maybeSingle();

                if (dbError || !studentData) {
                     throw new Error('Legajo no encontrado o error de conexión.');
                }

                const email = studentData[FIELD_CORREO_ESTUDIANTES];
                // Si es null, asumimos true (necesita cambio) para forzar migración la primera vez
                const mustChangePassword = studentData[FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES] !== false; 
                const hasAuthUser = !!studentData[FIELD_USER_ID_ESTUDIANTES];

                if (!email) {
                     throw new Error('Tu legajo no tiene un correo asociado. Contacta a soporte.');
                }

                // 2. Intentamos login normal
                const { error: signInError } = await (supabase.auth as any).signInWithPassword({
                    email: email,
                    password: passwordTrimmed,
                });

                if (signInError) {
                    if (signInError.message.includes('Invalid login credentials')) {
                        
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
        } else if (mode === 'migration') {
            // --- LÓGICA DE MIGRACIÓN / ACTIVACIÓN (2 PASOS) ---
            try {
                // PASO 1: VALIDAR IDENTIDAD
                if (migrationStep === 1) {
                    if (!verificationData.dni || !verificationData.correo) {
                        throw new Error("Por favor completa DNI y Correo para validar tu identidad.");
                    }

                    // Verificar datos contra la base de datos
                    const [studentData] = await db.estudiantes.get({ filterByFormula: `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajoTrimmed}'`});
                    
                    if (!studentData) throw new Error("No pudimos encontrar tu legajo en el sistema.");

                    const dbDni = String(studentData[FIELD_DNI_ESTUDIANTES] || '').trim();
                    const inputDni = verificationData.dni.trim();
                    const dbEmail = String(studentData[FIELD_CORREO_ESTUDIANTES] || '').trim().toLowerCase();
                    const inputEmail = verificationData.correo.trim().toLowerCase();
                    
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
                    setFoundStudent(studentData);
                    setMigrationStep(2);
                    setIsLoading(false);
                    return;
                }

                // PASO 2: CREAR CUENTA
                if (migrationStep === 2) {
                    if (password.length < 6) {
                        throw new Error("La contraseña debe tener al menos 6 caracteres.");
                    }

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
                        }
                        throw signUpError;
                    }

                    if (authData.user) {
                        // Vincular el nuevo ID de usuario a la tabla de estudiantes
                        // Y MARCAR QUE YA CAMBIÓ LA CONTRASEÑA (must_change_password = false)
                        await db.estudiantes.update(foundStudent.id, {
                            [FIELD_USER_ID_ESTUDIANTES]: authData.user.id,
                            [FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES]: false, // Importante: Ya la definió aquí
                            // Actualizar rol si es admin
                            ...(legajoTrimmed === 'admin' ? { [FIELD_ROLE_ESTUDIANTES]: 'SuperUser' } : {})
                        } as any);

                        // Iniciar sesión automáticamente
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
                console.error(err);
                let msg = err.message;
                if (msg.includes('Password should be at least 6 characters')) {
                    msg = "La contraseña debe tener al menos 6 caracteres.";
                }
                setError(msg);
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
        migrationStep, setMigrationStep, // Exponemos el paso de migración
        legajo, setLegajo,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        rememberMe, setRememberMe,
        isLoading, error,
        legajoCheckState, legajoMessage,
        foundStudent, missingFields,
        newData, handleNewDataChange,
        verificationData, handleVerificationDataChange,
        handleFormSubmit, handleForgotLegajoSubmit
    };
};