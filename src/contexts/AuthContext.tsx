
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES,
    FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES,
    FIELD_USER_ID_ESTUDIANTES
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
  login: (user: AuthUser, rememberMe?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
        const { data: { session } } = await (supabase.auth as any).getSession();

        if (session?.user) {
            // Query public table to get user details matching the Auth User ID
            const { data: profile, error } = await supabase
                .from('estudiantes')
                .select(`${FIELD_LEGAJO_ESTUDIANTES}, ${FIELD_NOMBRE_ESTUDIANTES}, ${FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES}, ${FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES}`) 
                .eq(FIELD_USER_ID_ESTUDIANTES, session.user.id) 
                .single();
            
            if (profile && !error) {
                setAuthenticatedUser({
                    id: session.user.id,
                    legajo: profile[FIELD_LEGAJO_ESTUDIANTES],
                    nombre: profile[FIELD_NOMBRE_ESTUDIANTES],
                    // Role handling would go here if added to public table
                    orientaciones: profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] ? [profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]] : [],
                    mustChangePassword: profile[FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES] || false
                });
            } else {
                 console.error("Error fetching user profile:", error?.message);
                 // If we have a session but no profile link, something is wrong with the data linkage
                 await (supabase.auth as any).signOut();
            }
        }
        setIsAuthLoading(false);
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(
      async (_event: any, session: any) => {
        setIsAuthLoading(true);
        if (session?.user) {
            const { data: profile, error } = await supabase
                .from('estudiantes')
                .select(`${FIELD_LEGAJO_ESTUDIANTES}, ${FIELD_NOMBRE_ESTUDIANTES}, ${FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES}, ${FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES}`)
                .eq(FIELD_USER_ID_ESTUDIANTES, session.user.id) 
                .single();

            if (profile && !error) {
                setAuthenticatedUser({
                    id: session.user.id,
                    legajo: profile[FIELD_LEGAJO_ESTUDIANTES],
                    nombre: profile[FIELD_NOMBRE_ESTUDIANTES],
                    orientaciones: profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] ? [profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]] : [],
                    mustChangePassword: profile[FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES] || false
                });
            } else {
                setAuthenticatedUser(null);
                 await (supabase.auth as any).signOut();
            }
        } else {
            setAuthenticatedUser(null);
        }
        setIsAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback((user: AuthUser, rememberMe = false) => {
    setAuthenticatedUser(user);
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('authenticatedUser', JSON.stringify(user));
  }, []);

  const logout = useCallback(async () => {
    sessionStorage.removeItem('authenticatedUser');
    localStorage.removeItem('authenticatedUser');
    
    const { error } = await (supabase.auth as any).signOut();
    if (error) console.error("Error logging out:", error.message);
    setAuthenticatedUser(null);
  }, []);

  const isSuperUserMode = authenticatedUser?.role === 'SuperUser' || authenticatedUser?.legajo === 'admin';
  const isJefeMode = authenticatedUser?.role === 'Jefe';
  const isDirectivoMode = authenticatedUser?.role === 'Directivo';
  const isAdminTesterMode = authenticatedUser?.role === 'AdminTester';
  const isReporteroMode = authenticatedUser?.role === 'Reportero';

  return (
    <AuthContext.Provider value={{ authenticatedUser, isSuperUserMode, isJefeMode, isDirectivoMode, isAdminTesterMode, isReporteroMode, isAuthLoading, login, logout }}>
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
