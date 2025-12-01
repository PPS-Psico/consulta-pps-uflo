
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

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
                // CRÍTICO: Limpiar caché al detectar cierre de sesión externo o inicial
                queryClient.clear(); 
            }
            clearTimeout(safetyTimeout);
            return;
        }

        // Si hay sesión, buscamos el perfil
        if (session?.user) {
            try {
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
                        console.warn("Sesión huérfana detectada (Usuario autenticado pero sin perfil en 'estudiantes').");
                        // No hacemos signOut aquí para evitar bucles infinitos si la DB falla,
                        // pero dejamos al usuario como null para que la UI lo maneje (redirija a login).
                        setAuthenticatedUser(null);
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
      }
    );

    return () => {
        isMounted = false;
        clearTimeout(safetyTimeout);
        subscription.unsubscribe();
    };
  }, [queryClient]);

  const login = useCallback((user: AuthUser) => {
    setAuthenticatedUser(user);
    setIsAuthLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
        // 1. IMPORTANTE: Limpiar estado global de React Query para evitar mezclar datos de usuarios
        // Esto soluciona el bug de que "no carga nada" al cambiar de cuenta.
        queryClient.removeQueries();
        queryClient.clear();
        
        // 2. Cerrar sesión en Supabase
        await (supabase.auth as any).signOut();
        
        // 3. Limpiar estado local
        setAuthenticatedUser(null);
        
        // 4. Limpiar storage local relevante por seguridad
        localStorage.removeItem('sb-' + process.env.VITE_SUPABASE_URL?.split('//')[1].split('.')[0] + '-auth-token');
        
    } catch (error) {
        console.error("Error signing out:", error);
        // Forzar limpieza local incluso si falla la red
        setAuthenticatedUser(null);
        queryClient.clear();
    }
  }, [queryClient]);

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
