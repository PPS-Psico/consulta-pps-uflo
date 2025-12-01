
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode, useRef } from 'react';
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
  const refreshLoopCounter = useRef(0);

  const logout = useCallback(async () => {
    try {
        console.log("🧹 Performing aggressive logout cleanup...");
        // 1. Clean React Query state
        queryClient.cancelQueries();
        queryClient.removeQueries();
        queryClient.clear();
        
        // 2. Sign out from Supabase
        await (supabase.auth as any).signOut();
        
        // 3. Clear local state
        setAuthenticatedUser(null);
        
        // 4. Aggressively clear all local storage to prevent stuck sessions
        // This fixes the "works in incognito but not normal" issue
        localStorage.clear();
        sessionStorage.clear();
        
    } catch (error) {
        console.error("Error signing out:", error);
        setAuthenticatedUser(null);
        localStorage.clear();
        sessionStorage.clear();
    }
  }, [queryClient]);

  useEffect(() => {
    let isMounted = true;

    // Safety Timeout: Force app to load (or logout) if Supabase hangs
    const safetyTimeout = setTimeout(() => {
        if (isMounted && isAuthLoading) {
            console.warn("⚠️ Auth check timed out - forcing reset.");
            // If we timed out and have no user, force a cleanup to ensure login screen works
            if (!authenticatedUser) {
                 logout().then(() => {
                     if(isMounted) setIsAuthLoading(false);
                 });
            } else {
                 if(isMounted) setIsAuthLoading(false);
            }
        }
    }, 5000);

    const initSession = async () => {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.warn("Initial Session Error - Clearing state:", error.message);
                await logout();
                if (isMounted) setIsAuthLoading(false);
                return;
            }
            if (!data.session) {
                 if (isMounted) {
                     setAuthenticatedUser(null);
                     setIsAuthLoading(false);
                 }
            }
        } catch (e) {
            console.error("Unexpected error during session check:", e);
            if (isMounted) setIsAuthLoading(false);
        }
    };

    initSession();

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(
      async (event: string, session: any) => {
        console.log(`AUTH EVENT: ${event}`);
        
        if (event === 'TOKEN_REFRESHED') {
            refreshLoopCounter.current += 1;
            if (refreshLoopCounter.current > 3) {
                console.error("🔄 Refresh loop detected. Forcing logout.");
                await logout();
                if (isMounted) setIsAuthLoading(false);
                return;
            }
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            refreshLoopCounter.current = 0;
        }
        
        // Bypass blocking for password reset flow
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
                queryClient.clear(); 
            }
            clearTimeout(safetyTimeout);
            return;
        }

        if (session?.user) {
            try {
                // Fetch profile
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
                        await logout(); 
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
  }, [queryClient, logout]);

  const login = useCallback((user: AuthUser) => {
    setAuthenticatedUser(user);
    setIsAuthLoading(false);
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
