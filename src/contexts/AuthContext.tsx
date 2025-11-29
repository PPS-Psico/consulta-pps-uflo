import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES,
    FIELD_USER_ID_ESTUDIANTES
} from '../constants';

export type AuthUser = {
  id?: string;
  legajo: string;
  nombre: string;
  role?: 'Jefe' | 'SuperUser' | 'Directivo' | 'AdminTester' | 'Reportero';
  orientaciones?: string[];
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
                .select(`${FIELD_LEGAJO_ESTUDIANTES}, ${FIELD_NOMBRE_ESTUDIANTES}, ${FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES}`) 
                .eq(FIELD_USER_ID_ESTUDIANTES, session.user.id) 
                .limit(1)
                .single();
            
            if (error) {
                 console.error("AUTH CRITICAL: Error buscando perfil en tabla 'estudiantes'.", error);
            }

            if (profile) {
                console.log("AUTH: Perfil encontrado y vinculado correctamente.", profile);
                setAuthenticatedUser({
                    id: session.user.id,
                    legajo: profile[FIELD_LEGAJO_ESTUDIANTES],
                    nombre: profile[FIELD_NOMBRE_ESTUDIANTES],
                    orientaciones: profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] ? [profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]] : [],
                });
            } else {
                 console.error("AUTH ERROR: Usuario autenticado pero NO VINCULADO en tabla pública. user_id no coincide o no existe.", { auth_id: session.user.id });
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
            console.log("AUTH: Ignorando evento post-reseteo para evitar race condition.");
            return;
        }
        
        setIsAuthLoading(true);
        if (session?.user) {
            const { data: profile, error } = await supabase
                .from('estudiantes')
                .select(`${FIELD_LEGAJO_ESTUDIANTES}, ${FIELD_NOMBRE_ESTUDIANTES}, ${FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES}`)
                .eq(FIELD_USER_ID_ESTUDIANTES, session.user.id) 
                .limit(1)
                .single();

            if (profile && !error) {
                setAuthenticatedUser({
                    id: session.user.id,
                    legajo: profile[FIELD_LEGAJO_ESTUDIANTES],
                    nombre: profile[FIELD_NOMBRE_ESTUDIANTES],
                    orientaciones: profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] ? [profile[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]] : [],
                });
            } else {
                console.error("AUTH CHANGE ERROR: Perfil no vinculado en cambio de estado.", { uid: session.user.id, error });
                setAuthenticatedUser(null);
                if (event !== 'SIGNED_OUT') {
                    await (supabase.auth as any).signOut();
                }
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