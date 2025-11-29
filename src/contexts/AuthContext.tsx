import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES,
    FIELD_USER_ID_ESTUDIANTES,
    FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES
} from '../constants';

export type AuthUser = {
  id?: string;
  legajo: string;
  nombre: string;
  role?: 'Jefe' | 'SuperUser' | 'Directivo' | 'AdminTester' | 'Reportero';
  orientaciones?: string[];
  mustChangePassword?: boolean;
};

interface AuthContextType {
  authenticatedUser: AuthUser | null;
  isSuperUserMode: boolean;
  isJefeMode: boolean;
  isDirectivoMode: boolean;
  isAdminTesterMode: boolean;
  isReporteroMode: boolean;
  isAuthLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  completePasswordChange: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
        console.log("AUTH: Iniciando verificación de sesión...");
        const { data: { session }, error: sessionError } = await (supabase.auth as any).getSession();
        
        if (sessionError) {
            console.error("AUTH: Error obteniendo sesión:", sessionError);
        }

        if (session?.user) {
            console.log("AUTH: Sesión activa encontrada.", { auth_user_id: session.user.id, email: session.user.email });

            const { data: profile, error } = await supabase
                .from('estudiantes')
                .select(`${FIELD_LEGAJO_ESTUDIANTES}, ${FIELD_NOMBRE_ESTUDIANTES}, ${FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES}, ${FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES}`) 
                .eq(FIELD_USER_ID_ESTUDIANTES, session.user.id) 
                .limit(1)
                .single();
            
            if (error) {
                 console.error("AUTH CRITICAL: Error buscando perfil en tabla 'estudiantes'.", error);
            }

            if (profile) {
                setAuthenticatedUser({
                    id: session.user.id,
                    legajo: profile[FIELD_LEGAJO_ESTUDIANTES],
                    nombre: profile[FIELD_NOMBRE_ESTUDIANTES],
                    orientaciones: profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] ? [profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]] : [],
                    mustChangePassword: profile[FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES],
                });
            } else {
                 console.error("AUTH ERROR: Usuario autenticado pero NO VINCULADO en tabla pública.");
                 await (supabase.auth as any).signOut();
            }
        } else {
            console.log("AUTH: No hay sesión activa.");
        }
        setIsAuthLoading(false);
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(
      async (event: string, session: any) => {
        console.log(`AUTH EVENT: ${event}`);
        
        const isResetting = sessionStorage.getItem('__password_reset_in_progress');
        if (isResetting) {
            sessionStorage.removeItem('__password_reset_in_progress');
            return;
        }
        
        setIsAuthLoading(true);
        if (session?.user) {
            const { data: profile, error } = await supabase
                .from('estudiantes')
                .select(`${FIELD_LEGAJO_ESTUDIANTES}, ${FIELD_NOMBRE_ESTUDIANTES}, ${FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES}, ${FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES}`)
                .eq(FIELD_USER_ID_ESTUDIANTES, session.user.id) 
                .limit(1)
                .single();

            if (profile && !error) {
                setAuthenticatedUser({
                    id: session.user.id,
                    legajo: profile[FIELD_LEGAJO_ESTUDIANTES],
                    nombre: profile[FIELD_NOMBRE_ESTUDIANTES],
                    orientaciones: profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] ? [profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]] : [],
                    mustChangePassword: profile[FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES],
                });
            } else {
                setAuthenticatedUser(null);
            }
        } else {
            setAuthenticatedUser(null);
        }
        setIsAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback((user: AuthUser) => {
    setAuthenticatedUser(user);
  }, []);

  const logout = useCallback(async () => {
    const { error } = await (supabase.auth as any).signOut();
    if (error) console.error("Error logging out:", error.message);
    setAuthenticatedUser(null);
  }, []);

  const completePasswordChange = useCallback(() => {
    setAuthenticatedUser(prev => prev ? { ...prev, mustChangePassword: false } : null);
  }, []);

  const isSuperUserMode = authenticatedUser?.role === 'SuperUser' || authenticatedUser?.legajo === 'admin';
  const isJefeMode = authenticatedUser?.role === 'Jefe';
  const isDirectivoMode = authenticatedUser?.role === 'Directivo';
  const isAdminTesterMode = authenticatedUser?.role === 'AdminTester';
  const isReporteroMode = authenticatedUser?.role === 'Reportero';

  return (
    <AuthContext.Provider value={{ authenticatedUser, isSuperUserMode, isJefeMode, isDirectivoMode, isAdminTesterMode, isReporteroMode, isAuthLoading, login, logout, completePasswordChange }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};