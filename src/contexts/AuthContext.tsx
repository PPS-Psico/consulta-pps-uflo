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
    let isMounted = true;

    // Safety Timeout: Force app to load if Supabase hangs for more than 5 seconds
    const safetyTimeout = setTimeout(() => {
        if (isMounted && isAuthLoading) {
            console.warn("Auth check timed out - forcing app load state.");
            setIsAuthLoading(false);
        }
    }, 5000);

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(
      async (event: string, session: any) => {
        console.log(`AUTH EVENT: ${event}`);
        
        // Si estamos reseteando pass, no bloqueamos
        const isResetting = sessionStorage.getItem('__password_reset_in_progress');
        if (isResetting) {
            sessionStorage.removeItem('__password_reset_in_progress');
            if (isMounted) setIsAuthLoading(false);
            clearTimeout(safetyTimeout);
            return;
        }
        
        if (event === 'SIGNED_OUT' || !session) {
            if (isMounted) {
                setAuthenticatedUser(null);
                setIsAuthLoading(false);
            }
            clearTimeout(safetyTimeout);
            return;
        }

        // Si hay sesión, buscamos el perfil
        try {
            if (session?.user) {
                const { data: profile, error } = await supabase
                    .from('estudiantes')
                    .select(`${FIELD_LEGAJO_ESTUDIANTES}, ${FIELD_NOMBRE_ESTUDIANTES}, ${FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES}, ${FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES}, ${FIELD_ROLE_ESTUDIANTES}`)
                    .eq(FIELD_USER_ID_ESTUDIANTES, session.user.id) 
                    .maybeSingle();

                if (isMounted) {
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
                        console.warn("Sesión huérfana detectada. Limpiando estado local.");
                        // IMPORTANTE: No llamar a signOut() aquí directamente para evitar bucles.
                        // Simplemente ponemos el usuario en null y dejamos que la sesión muera o el usuario intente de nuevo.
                        setAuthenticatedUser(null);
                    }
                }
            }
        } catch (error) {
            console.error("Critical error in onAuthStateChange:", error);
            if (isMounted) setAuthenticatedUser(null);
        } finally {
            if (isMounted) setIsAuthLoading(false);
            clearTimeout(safetyTimeout);
        }
      }
    );

    return () => {
        isMounted = false;
        clearTimeout(safetyTimeout);
        subscription.unsubscribe();
    };
  }, []);

  const login = useCallback((user: AuthUser) => {
    setAuthenticatedUser(user);
    setIsAuthLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
        await (supabase.auth as any).signOut();
        setAuthenticatedUser(null);
    } catch (error) {
        console.error("Error signing out:", error);
    }
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