
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
                    console.warn("Auth session found but no matching student profile or DB error.", error?.message);
                    setAuthenticatedUser(null);
                    // Force sign out to clear inconsistent state, especially on initial load or sign-in.
                    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                        await (supabase.auth as any).signOut();
                    }
                }
            } else {
                setAuthenticatedUser(null);
            }
        } catch (error) {
            console.error("Critical error in onAuthStateChange:", error);
            setAuthenticatedUser(null);
        } finally {
            // Unlocks the UI after the first auth event (INITIAL_SESSION) is processed.
            // Subsequent events (like TOKEN_REFRESHED) will update the user state
            // without re-enabling the global loading screen.
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
    setIsAuthLoading(true); // Show loading while signing out
    try {
        const { error } = await (supabase.auth as any).signOut();
        if (error) console.error("Error logging out:", error.message);
    } catch (e) {
        console.error("Unexpected error logging out:", e);
    } finally {
        setAuthenticatedUser(null);
        setIsAuthLoading(false);
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
