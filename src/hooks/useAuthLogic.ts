import { useState, FormEvent, ChangeEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getStudentLoginInfo, db } from '../lib/db';
import { 
    FIELD_DNI_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, FIELD_USER_ID_ESTUDIANTES
} from '../constants';
import type { EstudianteFields, AirtableRecord } from '../types';
import type { AuthUser } from '../contexts/AuthContext';


interface UseAuthLogicProps {
    login: (user: AuthUser) => void;
    showModal: (title: string, message: string) => void;
}

export const useAuthLogic = ({ login, showModal }: UseAuthLogicProps) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
    // Nuevo estado para controlar el paso del reset: 'verify' (DNI/Mail) o 'setPassword' (Nueva pass)
    const [resetStep, setResetStep] = useState<'verify' | 'setPassword'>('verify');
    
    const [legajo, setLegajo] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Registration-related state is kept for potential future re-implementation
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
        setResetStep('verify'); // Resetear al paso 1 al cambiar de modo
        setVerificationData({ dni: '', correo: '', telefono: '' });
    };

    const handleModeChange = (newMode: 'login' | 'register' | 'forgot' | 'reset') => {
        setMode(newMode);
        resetFormState();
    };


    const handleNewDataChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === FIELD_DNI_ESTUDIANTES) {
            const numericString = value.replace(/\D/g, '');
            if (numericString === '') {
                setNewData(prev => ({ ...prev, [name]: null }));
            } else {
                setNewData(prev => ({ ...prev, [name]: parseInt(numericString, 10) }));
            }
        } else {
            setNewData(prev => ({ ...prev, [name]: value || null }));
        }
    };

    const handleVerificationDataChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setVerificationData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const legajoTrimmed = legajo.trim();
        const passwordTrimmed = password.trim();
        
        // --- Preview/Testing User Logic (Bypasses Supabase) ---
        if (legajoTrimmed === 'testing' && passwordTrimmed === 'testing') {
            login({ legajo: '99999', nombre: 'Usuario de Prueba', role: 'AdminTester' });
            return;
        }
        if (legajoTrimmed === '12345' && passwordTrimmed === '12345') {
            login({ legajo: '12345', nombre: 'Estudiante de Prueba' });
            return;
        }
        if (legajoTrimmed === 'reportero' && passwordTrimmed === 'reportero') {
            login({ legajo: 'reportero', nombre: 'Usuario Reportero', role: 'Reportero' });
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

                const loginInfo = await getStudentLoginInfo(legajoTrimmed);

                if (!loginInfo || !loginInfo.email) {
                     throw new Error('No encontramos una cuenta asociada a este legajo. Si es tu primera vez, contacta a soporte.');
                }

                const { error: signInError } = await (supabase.auth as any).signInWithPassword({
                    email: loginInfo.email,
                    password: passwordTrimmed,
                });

                if (signInError) {
                    if (signInError.message.includes('Invalid login credentials')) {
                        // Instead of showing an error, switch to reset mode
                        setMode('reset');
                        setResetStep('verify');
                        // Not pre-filling to force verification
                    } else {
                        throw signInError;
                    }
                }
                // AuthProvider will handle successful login
                
            } catch (err: any) {
                console.error("Login error:", err);
                setError(err.message || 'Error al iniciar sesión. Verifica tu legajo y contraseña.');
            } finally {
                setIsLoading(false);
            }
        } else if (mode === 'reset') {
            try {
                // PASO 1: VERIFICAR IDENTIDAD
                if (resetStep === 'verify') {
                    if (!verificationData.dni || !verificationData.correo) {
                        throw new Error("Por favor completa DNI y Correo.");
                    }

                    const [studentData] = await db.estudiantes.get({ filterByFormula: `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajoTrimmed}'`});
                    if (!studentData) throw new Error("No se pudo encontrar el estudiante para verificar.");

                    const isDniMatch = String(studentData[FIELD_DNI_ESTUDIANTES] || '').trim() === verificationData.dni.trim();
                    const isEmailMatch = String(studentData[FIELD_CORREO_ESTUDIANTES] || '').trim().toLowerCase() === verificationData.correo.trim().toLowerCase();
                    
                    if (!isDniMatch || !isEmailMatch) {
                        throw new Error("Los datos de verificación (DNI y Correo) no coinciden con nuestros registros.");
                    }

                    // Si todo coincide, avanzamos al paso 2
                    setResetStep('setPassword');
                    setIsLoading(false);
                    return; 
                }

                // PASO 2: ACTUALIZAR CONTRASEÑA
                if (resetStep === 'setPassword') {
                    if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");
                    
                    const [studentData] = await db.estudiantes.get({ filterByFormula: `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajoTrimmed}'`});
                    if (!studentData || !studentData[FIELD_USER_ID_ESTUDIANTES]) throw new Error("Error de sesión. Intenta de nuevo.");

                    const email = verificationData.correo.trim().toLowerCase();
                    const dniAsPassword = String(verificationData.dni).trim();

                    const { data: signInData, error: signInError } = await (supabase.auth as any).signInWithPassword({
                        email: email,
                        password: dniAsPassword,
                    });

                    if (signInError || !signInData.session) {
                        console.error("Fallo login con DNI:", signInError);
                        throw new Error("No pudimos validar tu identidad con el DNI como contraseña temporal. Es posible que ya hayas cambiado tu contraseña antes. Si no la recuerdas, contacta a soporte administrativo.");
                    }

                    const { error: updatePassError } = await (supabase.auth as any).updateUser({
                        password: password
                    });

                    if (updatePassError) throw updatePassError;

                    // Set flag to prevent race condition in onAuthStateChange
                    sessionStorage.setItem('__password_reset_in_progress', 'true');
                    
                    // Manually log in the user with the correct, updated data.
                    login({
                        id: studentData[FIELD_USER_ID_ESTUDIANTES],
                        legajo: studentData[FIELD_LEGAJO_ESTUDIANTES],
                        nombre: studentData[FIELD_NOMBRE_ESTUDIANTES],
                        orientaciones: studentData[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] ? [studentData[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]] : [],
                    });
                }

            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        } else {
            // Registration is currently disabled
            setIsLoading(false);
        }
    };

    const handleForgotLegajoSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setMode('reset');
    };
    
    return {
        mode, setMode: handleModeChange,
        resetStep,
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