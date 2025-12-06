
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
  
  // Refs to track state without triggering re-renders
  const refreshLoopCounter = useRef(0);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(async () => {
    try {
        console.log("🧹 Logging out...");
        
        // 1. Cancel React Query fetching
        queryClient.cancelQueries();
        queryClient.clear();
        
        // 2. Clear local state first to update UI immediately
        setAuthenticatedUser(null);
        
        // 3. Sign out from Supabase
        const { error } = await (supabase.auth as any).signOut();
        if (error) console.error("Supabase signOut error:", error.message);

        // 4. Clear storage explicitly if needed (optional, Supabase handles its own keys)
        localStorage.removeItem('sb-qxnxtnhtbpsgzprqtrjl-auth-token'); 
        
    } catch (error) {
        console.error("Error during forced logout:", error);
        setAuthenticatedUser(null);
    }
  }, [queryClient]);

  useEffect(() => {
    let isMounted = true;

    // Clear any existing timeout
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

    // Safety Timeout: If nothing happens in 8 seconds, stop loading.
    // We do NOT force logout here automatically to avoid loops. We just stop the spinner.
    safetyTimeoutRef.current = setTimeout(() => {
        if (isMounted && isAuthLoading) {
            console.warn("⚠️ Auth check timed out. Stopping spinner.");
            setIsAuthLoading(false);
        }
    }, 8000);

    const processSession = async (session: any) => {
        // If no session, clear user and stop loading
        if (!session?.user) {
            if (isMounted) {
                setAuthenticatedUser(null);
                setIsAuthLoading(false);
            }
            return;
        }

        try {
            // Fetch profile from DB
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
                    // Orphaned session (User exists in Auth but not in DB)
                    // Check if it's a special admin account or really an error
                    console.warn("Profile not found for authenticated user.");
                    await logout();
                }
            }
        } catch (err) {
            console.error("Profile fetch error:", err);
            if (isMounted) setAuthenticatedUser(null);
        } finally {
            if (isMounted) setIsAuthLoading(false);
        }
    };

    // Initialize: Get current session
    supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
            // Handle "Invalid Refresh Token" gracefully (treat as logged out instead of error)
            const msg = error.message.toLowerCase();
            const isRefreshError = msg.includes("refresh token") || msg.includes("not found") || msg.includes("invalid");
            
            if (isRefreshError) {
                console.log("ℹ️ Sesión anterior expirada (Refresh Token inválido). Limpiando estado.");
                localStorage.removeItem('sb-qxnxtnhtbpsgzprqtrjl-auth-token');
                // Intentamos un signOut limpio para purgar estado interno del cliente
                supabase.auth.signOut().catch(() => {});
            } else {
                console.error("GetSession Error:", error.message);
            }
            
            if (isMounted) setIsAuthLoading(false);
            // If invalid refresh token, Supabase usually triggers SIGNED_OUT event next
        } else {
            processSession(data.session);
        }
    });

    // Listen for changes
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(
      async (event: string, session: any) => {
        console.log(`AUTH EVENT: ${event}`);

        // Clear safety timeout on any event, as we are communicating
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

        if (event === 'TOKEN_REFRESHED') {
            refreshLoopCounter.current += 1;
            if (refreshLoopCounter.current > 5) {
                console.error("🔄 Refresh loop detected. Forcing logout.");
                refreshLoopCounter.current = 0;
                await logout();
                if (isMounted) setIsAuthLoading(false);
                return;
            }
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            refreshLoopCounter.current = 0;
            processSession(session);
        } else if (event === 'SIGNED_OUT') {
            refreshLoopCounter.current = 0;
            if (isMounted) {
                setAuthenticatedUser(null);
                setIsAuthLoading(false);
                queryClient.clear();
            }
        }
      }
    );

    return () => {
        isMounted = false;
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
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
