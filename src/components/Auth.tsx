
import React, { useState } from 'react';
import MiPanelLogo from './MiPanelLogo';
import UfloLogo from './UfloLogo';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useTheme } from '../contexts/ThemeContext';
import Input from './Input';
import { useAuthLogic } from '../hooks/useAuthLogic';
import { 
    FIELD_DNI_ESTUDIANTES, 
    FIELD_FECHA_NACIMIENTO_ESTUDIANTES, 
    FIELD_CORREO_ESTUDIANTES, 
    FIELD_TELEFONO_ESTUDIANTES
} from '../constants';


const Auth: React.FC = () => {
  const { login } = useAuth();
  const { showModal } = useModal();
  const { resolvedTheme } = useTheme();

  const {
      mode, setMode,
      migrationStep, setMigrationStep,
      legajo, setLegajo,
      password, setPassword,
      confirmPassword, setConfirmPassword,
      rememberMe, setRememberMe,
      isLoading, error,
      verificationData, handleVerificationDataChange,
      handleFormSubmit
  } = useAuthLogic({ login, showModal });
  
  const [showPassword, setShowPassword] = useState(false);

  const handleModeChange = (newMode: 'login' | 'register' | 'forgot' | 'reset' | 'migration') => {
    setMode(newMode);
    if (newMode !== 'reset' && newMode !== 'migration') {
        setLegajo('');
        setPassword('');
        setConfirmPassword('');
    }
  };

  const renderLoginRegister = () => (
    <>
      <div className="flex md:hidden justify-center items-center gap-4 mb-8"><UfloLogo className="h-12 w-auto" variant={resolvedTheme} /><MiPanelLogo className="h-12 w-auto" variant={resolvedTheme} /></div>
      
      <div className="text-left mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight animate-fade-in-up" style={{ animationDelay: '400ms' }}>Acceso de Estudiantes</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 animate-fade-in-up" style={{ animationDelay: '500ms' }}>Accede a tu cuenta o regístrate para comenzar.</p>
      </div>
      
      <div className="p-1 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center mb-8 ring-1 ring-slate-200/50 dark:ring-slate-600/50 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
        <button onClick={() => handleModeChange('login')} className={`w-full py-2.5 text-sm font-semibold rounded-md transition-all duration-300 ${mode === 'login' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-600/50 hover:text-slate-700 dark:hover:text-slate-200'}`}>Iniciar Sesión</button>
        <button disabled className={`w-full py-2.5 text-sm font-semibold rounded-md transition-all duration-300 opacity-50 cursor-not-allowed text-slate-500 dark:text-slate-400`}>Crear Usuario</button>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-5">
        <div className="animate-fade-in-up" style={{ animationDelay: '700ms' }}>
          <label htmlFor="legajo" className="sr-only">Número de Legajo</label>
          <div className="relative">
            <Input id="legajo" type="text" value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Número de Legajo" icon="badge" disabled={isLoading} autoComplete="username"/>
          </div>
        </div>

        <div className="space-y-1 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
          <div className="relative">
            <label htmlFor="password" className="sr-only">Contraseña</label>
            <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" icon="lock" disabled={isLoading} autoComplete="current-password"/>
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between animate-fade-in-up" style={{ animationDelay: '950ms' }}>
            <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer select-none group">
                <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={isLoading} className="sr-only"/>
                <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ease-in-out ${rememberMe ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700'} group-hover:border-blue-500`}>
                    <span className={`material-icons !text-sm text-white transition-transform duration-200 ease-in-out ${rememberMe ? 'scale-100' : 'scale-0'}`}>check</span>
                </div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Recordarme</span>
            </label>
        </div>
        <div className="pt-4 animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold text-base py-3 px-6 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-3">
            {isLoading && <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>}
            <span>Ingresar</span>
          </button>
        </div>
      </form>
    </>
  );

  const renderMigration = () => (
      <form onSubmit={handleFormSubmit} className="space-y-5 animate-fade-in-up">
          <div className="text-left mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold mb-3 border border-blue-100 dark:border-blue-800">
                  <span className="material-icons !text-sm">person_add</span>
                  Activa tu cuenta
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                  {migrationStep === 1 ? "1. Validar Identidad" : "2. Crear Contraseña"}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed">
                  {migrationStep === 1 
                    ? <>Hola <strong>{legajo}</strong>. Para activar tu acceso, primero necesitamos validar tu identidad.</>
                    : "¡Identidad validada! Ahora define tu contraseña para acceder al sistema."
                  }
              </p>
          </div>

          {migrationStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                  <Input 
                      name="dni" 
                      type="text" 
                      placeholder="Tu DNI (sin puntos)" 
                      icon="badge" 
                      value={verificationData.dni} 
                      onChange={handleVerificationDataChange} 
                      disabled={isLoading} 
                      inputMode="numeric" 
                      pattern="[0-9]*"
                      autoFocus
                  />
                  <Input 
                      name="correo" 
                      type="email" 
                      placeholder="Correo electrónico registrado" 
                      icon="email" 
                      value={verificationData.correo} 
                      onChange={handleVerificationDataChange} 
                      disabled={isLoading} 
                  />
              </div>
          )}

          {migrationStep === 2 && (
               <div className="space-y-4 animate-fade-in">
                   <div className="relative">
                    <label htmlFor="new-password" className="sr-only">Nueva Contraseña</label>
                    <Input 
                        id="new-password" 
                        type={showPassword ? 'text' : 'password'} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Contraseña (Mínimo 6 caracteres)" 
                        icon="lock" 
                        disabled={isLoading}
                        className={password.length > 0 && password.length < 6 ? "border-red-500 focus:border-red-500" : ""}
                        autoFocus
                    />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                        <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 px-1 font-medium flex items-start gap-1">
                      <span className="material-icons !text-sm mt-0.5">check_circle</span>
                      Puedes usar la misma contraseña que usabas antes si tiene al menos 6 caracteres.
                  </p>
              </div>
          )}

          <div className="pt-4 space-y-3">
              <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white font-bold text-base py-3 px-6 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:bg-emerald-700 hover:-translate-y-0.5 active:scale-95 active:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                  {isLoading ? (
                      <><div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div><span>Procesando...</span></>
                  ) : (
                      <span>{migrationStep === 1 ? 'Validar Identidad' : 'Activar Cuenta'}</span>
                  )}
              </button>
              
              <button 
                type="button" 
                onClick={() => migrationStep === 2 ? setMigrationStep(1) : handleModeChange('login')} 
                className="w-full text-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                  {migrationStep === 2 ? "Volver atrás" : "Cancelar"}
              </button>
          </div>
      </form>
  );

  return (
    <div className="w-full bg-white dark:bg-slate-800 md:grid md:grid-cols-2 min-h-[85vh] rounded-2xl shadow-2xl shadow-slate-200/40 dark:shadow-black/20 overflow-hidden border border-slate-200/60 dark:border-slate-700/80">
      <div className="hidden md:flex flex-col justify-between p-8 lg:p-12 bg-gradient-to-br from-slate-50 to-slate-200 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 text-slate-800 dark:text-white relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-3/4 h-3/4 bg-blue-600/30 dark:bg-blue-500/40 rounded-full filter blur-3xl animate-pulse" style={{animationDuration: '8s'}} />
        <div className="absolute -bottom-1/4 -left-1/4 w-3/4 h-3/4 bg-indigo-600/30 dark:bg-indigo-500/40 rounded-full filter blur-3xl animate-pulse" style={{animationDuration: '10s', animationDelay: '2s'}} />
        <div className="relative z-10">
          <div className="flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '0ms' }}><MiPanelLogo className="h-16 w-auto" variant={resolvedTheme} /></div>
          <div className="flex-grow flex flex-col justify-center mt-20">
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter leading-tight animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              Tu Panel<br/>Académico.
            </h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-lg lg:text-xl max-w-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              El portal centralizado para el seguimiento de tus Prácticas Profesionales Supervisadas.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}><UfloLogo className="h-16 w-auto" variant={resolvedTheme} /></div>
      </div>

      <div className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-full">
        <main className="w-full max-w-md">
            {mode === 'login' ? renderLoginRegister() :
             mode === 'migration' ? renderMigration() :
             null /* Removed unused renderForgot/renderReset from display logic for simplicity */
            }
            <div aria-live="assertive" className="mt-4">
              {error && <p className="text-red-600 dark:text-red-400 text-sm text-center pt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-800">{error}</p>}
            </div>
        </main>
      </div>
    </div>
  );
};

export default Auth;
