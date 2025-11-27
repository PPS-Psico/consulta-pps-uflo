
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

// Helper to safely process role from Supabase
const getProcessedRole = (roleValue: any): 'Jefe' | 'SuperUser' | 'Directivo' | 'AdminTester' | 'Reportero' | undefined => {
    if (!roleValue) return undefined;
    if (Array.isArray(roleValue)) {
        const firstRole = roleValue.find(r => typeof r === 'string' && r.trim() !== '');
        if (!firstRole) return undefined;
        roleValue = firstRole;
    }
    if (typeof roleValue !== 'string') return undefined;
    const trimmedRole = roleValue.trim();
    const validRoles = ['Jefe', 'SuperUser', 'Directivo', 'AdminTester', 'Reportero'];
    if (validRoles.includes(trimmedRole)) {
        return trimmedRole as 'Jefe' | 'SuperUser' | 'Directivo' | 'AdminTester' | 'Reportero';
    }
    return undefined;
};

export type AuthUser = {
  id?: string; // Supabase user ID
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
  login: (user: AuthUser, rememberMe?: boolean) => void; // Kept for preview/testing users
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
        // Cast to any to support v2 methods if types are outdated
        const { data: { session } } = await (supabase.auth as any).getSession();

        if (session?.user) {
            // Consultamos la tabla usando las columnas en minúsculas definidas en el SQL
            const { data: profile, error } = await supabase
                .from('estudiantes')
                .select('legajo, nombre, orientacion_elegida') 
                .eq('id', session.user.id) // Asume que id estudiante = auth.uid
                .single();
            
            if (profile && !error) {
                setAuthenticatedUser({
                    id: session.user.id,
                    legajo: profile.legajo,
                    nombre: profile.nombre,
                    // role: getProcessedRole(profile.role), // Descomentar si se agrega columna role en SQL
                    orientaciones: profile.orientacion_elegida ? [profile.orientacion_elegida] : []
                });
            } else {
                 console.error("Error fetching user profile:", error?.message);
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
                .select('legajo, nombre, orientacion_elegida')
                .eq('id', session.user.id) 
                .single();

            if (profile && !error) {
                setAuthenticatedUser({
                    id: session.user.id,
                    legajo: profile.legajo,
                    nombre: profile.nombre,
                    // role: getProcessedRole(profile.role), 
                    orientaciones: profile.orientacion_elegida ? [profile.orientacion_elegida] : []
                });
            } else {
                console.error("Error fetching user profile on state change:", error?.message);
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

  // This login function is now primarily for preview/testing users that don't exist in Supabase Auth.
  const login = useCallback((user: AuthUser, rememberMe = false) => {
    setAuthenticatedUser(user);
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('authenticatedUser', JSON.stringify(user));
  }, []);

  const logout = useCallback(async () => {
    sessionStorage.removeItem('authenticatedUser');
    localStorage.removeItem('authenticatedUser');
    
    const { error } = await (supabase.auth as any).signOut();
    if (error) {
        console.error("Error logging out:", error.message);
    }
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
