import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES,
    FIELD_USER_ID_ESTUDIANTES,
    FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES,
    FIELD_ROLE_ESTUDIANTES
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
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(
      async (event: string, session: any) => {
        console.log(`AUTH EVENT: ${event}`);
        
        const isResetting = sessionStorage.getItem('__password_reset_in_progress');
        if (isResetting) {
            sessionStorage.removeItem('__password_reset_in_progress');
            setIsAuthLoading(false);
            return;
        }
        
        try {
            if (session?.user) {
                const { data: profile, error } = await supabase
                    .from('estudiantes')
                    .select(`${FIELD_LEGAJO_ESTUDIANTES}, ${FIELD_NOMBRE_ESTUDIANTES}, ${FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES}, ${FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES}, ${FIELD_ROLE_ESTUDIANTES}`)
                    .eq(FIELD_USER_ID_ESTUDIANTES, session.user.id) 
                    .maybeSingle();

                if (profile && !error) {
                    const dbRole = profile[FIELD_ROLE_ESTUDIANTES] as AuthUser['role'] | undefined;

                    setAuthenticatedUser({
                        id: session.user.id,
                        legajo: profile[FIELD_LEGAJO_ESTUDIANTES],
                        nombre: profile[FIELD_NOMBRE_ESTUDIANTES],
                        orientaciones: profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] ? [profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]] : [],
                        mustChangePassword: profile[FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES],
                        role: dbRole
                    });
                } else {
                    console.warn("Sesión huérfana detectada (Auth existe, DB no). Limpiando...");
                    // CRÍTICO: Si existe sesión de Auth pero no perfil, forzamos logout.
                    // Esto limpia el localStorage corrupto/viejo del navegador.
                    await supabase.auth.signOut();
                    setAuthenticatedUser(null);
                }
            } else {
                setAuthenticatedUser(null);
            }
        } catch (error) {
            console.error("Critical error in onAuthStateChange:", error);
            setAuthenticatedUser(null);
        } finally {
            setIsAuthLoading(false);
        }
      }
    );

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  const login = useCallback((user: AuthUser) => {
    setAuthenticatedUser(user);
  }, []);

  const logout = useCallback(async () => {
    setIsAuthLoading(true);
    const { error } = await (supabase.auth as any).signOut();
    if (error) {
        console.error("Error during sign out:", error.message);
        setIsAuthLoading(false);
    }
    // El listener onAuthStateChange manejará el estado null y loading false
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