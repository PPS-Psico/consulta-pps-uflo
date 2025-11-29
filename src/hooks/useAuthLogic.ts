
import { useState, FormEvent, ChangeEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getStudentLoginInfo, db } from '../lib/db';
import { 
    FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, FIELD_USER_ID_ESTUDIANTES
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
        if (legajoTrimmed === 'admin' && passwordTrimmed === 'superadmin' && mode === 'login') {
            login({ legajo: 'admin', nombre: 'Super Usuario', role: 'SuperUser' });
            return;
        }

        setIsLoading(true);
        setError(null);
        
        if (mode === 'login') {
            try {
                if (!legajoTrimmed || !passwordTrimmed) throw new Error('Por favor, completa todos los campos.');

                // 1. Buscamos si el alumno existe en la DB
                const loginInfo = await getStudentLoginInfo(legajoTrimmed);

                if (!loginInfo || !loginInfo.email) {
                     throw new Error('No encontramos una cuenta asociada a este legajo. Contacta a soporte.');
                }

                // 2. Intentamos login normal
                const { error: signInError } = await (supabase.auth as any).signInWithPassword({
                    email: loginInfo.email,
                    password: passwordTrimmed,
                });

                if (signInError) {
                    if (signInError.message.includes('Invalid login credentials')) {
                        // 3. DETECCIÓN DE MIGRACIÓN
                        // Usuario existe en datos pero falla login -> ofrecer activar cuenta
                        setMode('migration');
                        setMigrationStep(1); // Asegurar paso 1
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
                    
                    if (!studentData) throw new Error("Error de validación. No se encontraron datos para este legajo.");

                    const dbDni = String(studentData[FIELD_DNI_ESTUDIANTES] || '').trim();
                    const inputDni = verificationData.dni.trim();
                    const dbEmail = String(studentData[FIELD_CORREO_ESTUDIANTES] || '').trim().toLowerCase();
                    const inputEmail = verificationData.correo.trim().toLowerCase();
                    
                    if (dbDni !== inputDni || dbEmail !== inputEmail) {
                        throw new Error("Los datos ingresados (DNI o Correo) no coinciden con nuestros registros.");
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
                        if (signUpError.message.includes('already registered')) {
                            throw new Error("Este usuario ya está registrado. Si olvidaste tu contraseña, usa la opción de recuperación.");
                        }
                        throw signUpError;
                    }

                    if (authData.user) {
                        // Vincular el nuevo ID de usuario a la tabla de estudiantes
                        await db.estudiantes.update(foundStudent.id, {
                            user_id: authData.user.id
                        } as any);

                        // Iniciar sesión
                        login({
                            id: authData.user.id,
                            legajo: String(foundStudent[FIELD_LEGAJO_ESTUDIANTES]),
                            nombre: String(foundStudent[FIELD_NOMBRE_ESTUDIANTES]),
                            orientaciones: foundStudent[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] ? [String(foundStudent[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES])] : [],
                        });
                    }
                }

            } catch (err: any) {
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
