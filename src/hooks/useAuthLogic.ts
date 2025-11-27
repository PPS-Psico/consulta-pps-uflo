
import { useState, FormEvent, ChangeEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getStudentLoginInfo } from '../lib/db';
import { 
    FIELD_DNI_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES
} from '../constants';
import type { EstudianteFields, AirtableRecord } from '../types';
import type { AuthUser } from '../contexts/AuthContext';


interface UseAuthLogicProps {
    login: (user: AuthUser, rememberMe?: boolean) => void;
    showModal: (title: string, message: string) => void;
}

export const useAuthLogic = ({ login, showModal }: UseAuthLogicProps) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
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
            login({ legajo: '99999', nombre: 'Usuario de Prueba', role: 'AdminTester' }, rememberMe);
            return;
        }
        if (legajoTrimmed === '12345' && passwordTrimmed === '12345') {
            login({ legajo: '12345', nombre: 'Estudiante de Prueba' }, rememberMe);
            return;
        }
        if (legajoTrimmed === 'reportero' && passwordTrimmed === 'reportero') {
            login({ legajo: 'reportero', nombre: 'Usuario Reportero', role: 'Reportero' }, rememberMe);
            return;
        }
        if (legajoTrimmed === 'admin' && passwordTrimmed === 'superadmin' && mode === 'login') {
            login({ legajo: 'admin', nombre: 'Super Usuario', role: 'SuperUser' }, rememberMe);
            return;
        }

        setIsLoading(true);
        setError(null);
        
        if (mode === 'login') {
            try {
                if (!legajoTrimmed || !passwordTrimmed) throw new Error('Por favor, completa todos los campos.');

                // 1. CRÍTICO: Obtener el email asociado al legajo desde la base de datos pública
                // Esto permite que el usuario escriba su Legajo, pero el sistema use el Email para Auth.
                const loginInfo = await getStudentLoginInfo(legajoTrimmed);

                if (!loginInfo || !loginInfo.email) {
                     throw new Error('No encontramos una cuenta asociada a este legajo. Si es tu primera vez, contacta a soporte.');
                }

                // 2. Autenticar con Supabase usando el email recuperado y la contraseña ingresada
                // Cast as any para evitar problemas de tipado con versiones viejas de la lib
                const { error: signInError } = await (supabase.auth as any).signInWithPassword({
                    email: loginInfo.email,
                    password: passwordTrimmed,
                });

                if (signInError) {
                    if (signInError.message.includes('Invalid login credentials')) {
                        throw new Error('Contraseña incorrecta. Si es tu primera vez, intenta ingresar usando tu DNI como contraseña.');
                    }
                    throw signInError;
                }
                
                // El AuthProvider detectará el cambio de sesión automáticamente
                
            } catch (err: any) {
                console.error("Login error:", err);
                setError(err.message || 'Error al iniciar sesión. Verifica tu legajo y contraseña.');
            } finally {
                setIsLoading(false);
            }
        } else {
            // Registration and reset are currently disabled
            setIsLoading(false);
        }
    };

    const handleForgotLegajoSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("La recuperación de contraseña no está habilitada en esta fase de la migración.");
    };
    
    return {
        mode, setMode: handleModeChange,
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
