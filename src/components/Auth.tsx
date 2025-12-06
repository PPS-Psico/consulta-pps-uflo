
import React, { useState } from 'react';
import MiPanelLogo from './MiPanelLogo';
import UfloLogo from './UfloLogo';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useTheme } from '../contexts/ThemeContext';
import Input from './Input';
import { useAuthLogic } from '../hooks/useAuthLogic';
import { 
    FIELD_NOMBRE_SEPARADO_ESTUDIANTES, 
    FIELD_APELLIDO_SEPARADO_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES
} from '../constants';
import { toTitleCase } from '../utils/formatters';

const Auth: React.FC = () => {
  const { login } = useAuth();
  const { showModal } = useModal();
  const { resolvedTheme } = useTheme();

  const {
      mode, setMode,
      migrationStep, setMigrationStep,
      registerStep, setRegisterStep,
      resetStep,
      legajo, setLegajo,
      password, setPassword,
      confirmPassword, setConfirmPassword,
      rememberMe, setRememberMe,
      isLoading, error, fieldError,
      verificationData, handleVerificationDataChange,
      handleFormSubmit,
      foundStudent
  } = useAuthLogic({ login, showModal });
  
  const [showPassword, setShowPassword] = useState(false);

  const handleModeChange = (newMode: 'login' | 'register' | 'forgot' | 'reset' | 'migration' | 'recover') => {
    setMode(newMode);
    if (newMode !== 'reset' && newMode !== 'migration' && newMode !== 'recover' && newMode !== 'register') {
        setLegajo('');
        setPassword('');
        setConfirmPassword('');
    }
  };

  const getDisplayName = () => {
      if (!foundStudent) return '';
      const nombre = foundStudent[FIELD_NOMBRE_SEPARADO_ESTUDIANTES];
      const apellido = foundStudent[FIELD_APELLIDO_SEPARADO_ESTUDIANTES];
      if (nombre && apellido) return toTitleCase(`${nombre} ${apellido}`);
      return toTitleCase(foundStudent[FIELD_NOMBRE_ESTUDIANTES] || '');
  };

  const renderLoginRegister = () => (
    <>
      <div className="flex md:hidden justify-center items-center gap-4 mb-8"><UfloLogo className="h-12 w-auto" variant={resolvedTheme} /><MiPanelLogo className="h-12 w-auto" variant={resolvedTheme} /></div>
      
      <div className="text-left mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight animate-fade-in-up" style={{ animationDelay: '400ms' }}>Acceso de Estudiantes</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 animate-fade-in-up" style={{ animationDelay: '500ms' }}>Accede a tu cuenta o regístrate para comenzar.</p>
      </div>
      
      <div className="p-1 bg-slate-100 dark:bg-slate-900/50 rounded-lg flex items-center mb-8 ring-1 ring-slate-200/50 dark:ring-slate-700 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
        <button onClick={() => handleModeChange('login')} className={`w-full py-2.5 text-sm font-semibold rounded-md transition-all duration-300 ${mode === 'login' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200'}`}>Iniciar Sesión</button>
        <button onClick={() => handleModeChange('register')} className={`w-full py-2.5 text-sm font-semibold rounded-md transition-all duration-300 ${mode === 'register' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200'}`}>Crear Usuario</button>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-5">
        {mode === 'register' && registerStep === 2 ? (
            <div className="space-y-4 animate-fade-in">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-300 font-bold uppercase">Hola,</p>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{getDisplayName()}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Completa tus datos para finalizar el registro.</p>
                </div>

                <Input name="dni" type="text" placeholder="Tu DNI (sin puntos)" icon="fingerprint" value={verificationData.dni} onChange={handleVerificationDataChange} disabled={isLoading} inputMode="numeric" className="bg-white dark:bg-slate-900" />
                <Input name="correo" type="email" placeholder="Correo electrónico personal" icon="email" value={verificationData.correo} onChange={handleVerificationDataChange} disabled={isLoading} className="bg-white dark:bg-slate-900" />
                <Input name="telefono" type="tel" placeholder="Teléfono celular" icon="smartphone" value={verificationData.telefono} onChange={handleVerificationDataChange} disabled={isLoading} className="bg-white dark:bg-slate-900" />
                <div className="relative">
                    <Input id="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crear contraseña (mín. 6 caracteres)" icon="lock" disabled={isLoading} className="bg-white dark:bg-slate-900" />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                        <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                </div>
                <Input id="confirm-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetir contraseña" icon="lock_reset" disabled={isLoading} className="bg-white dark:bg-slate-900" />
            </div>
        ) : (
            <>
                <div className="animate-fade-in-up" style={{ animationDelay: '700ms' }}>
                  <label htmlFor="legajo" className="sr-only">Número de Legajo</label>
                  <div className="relative">
                    <Input id="legajo" type="text" value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Número de Legajo" icon="badge" disabled={isLoading} autoComplete="username" className="bg-white dark:bg-slate-900" autoFocus />
                  </div>
                </div>

                {mode === 'login' && (
                    <div className="space-y-1 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
                      <div className="relative">
                        <label htmlFor="password" className="sr-only">Contraseña</label>
                        <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" icon="lock" disabled={isLoading} autoComplete="current-password" className={`bg-white dark:bg-slate-900 ${fieldError === 'password' ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                          <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                    </div>
                )}

                {mode === 'login' && (
                    <div className="flex items-center justify-between animate-fade-in-up" style={{ animationDelay: '950ms' }}>
                        <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer select-none group">
                            <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={isLoading} className="sr-only"/>
                            <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ease-in-out ${rememberMe ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'} group-hover:border-blue-500`}>
                                <span className={`material-icons !text-sm text-white transition-transform duration-200 ease-in-out ${rememberMe ? 'scale-100' : 'scale-0'}`}>check</span>
                            </div>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-300">Recordarme</span>
                        </label>
                        
                        <button type="button" onClick={() => handleModeChange('recover')} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>
                )}
            </>
        )}
        
        <div className="pt-4 animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold text-base py-3 px-6 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-3">
            {isLoading && <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>}
            <span>{mode === 'login' ? 'Ingresar' : (registerStep === 1 ? 'Validar Legajo' : 'Registrarme')}</span>
          </button>
          
          {mode === 'register' && registerStep === 2 && (
               <button type="button" onClick={() => setRegisterStep(1)} className="w-full mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                   Volver
               </button>
          )}
        </div>
      </form>
    </>
  );

  const renderRecover = () => (
      <form onSubmit={handleFormSubmit} className="space-y-5 animate-fade-in-up">
           <div className="text-left mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-bold mb-3 border border-amber-100 dark:border-amber-800/30">
                  <span className="material-icons !text-sm">lock_reset</span>
                  Recuperación Segura
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Restablecer Contraseña
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed">
                  {resetStep === 'verify' 
                    ? "Para tu seguridad, necesitamos validar tu identidad con tus datos registrados."
                    : resetStep === 'reset_password'
                    ? "Identidad validada. Ahora puedes definir tu nueva contraseña."
                    : "¡Contraseña actualizada con éxito!"
                  }
              </p>
          </div>

          {resetStep === 'verify' && (
              <div className="space-y-4 animate-fade-in">
                  <Input id="rec-legajo" type="text" value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Número de Legajo" icon="badge" disabled={isLoading} className="bg-white dark:bg-slate-900" />
                  <Input name="dni" type="text" placeholder="DNI (sin puntos)" icon="fingerprint" value={verificationData.dni} onChange={handleVerificationDataChange} disabled={isLoading} inputMode="numeric" className="bg-white dark:bg-slate-900" />
                  <Input name="correo" type="email" placeholder="Correo electrónico registrado" icon="email" value={verificationData.correo} onChange={handleVerificationDataChange} disabled={isLoading} className="bg-white dark:bg-slate-900" />
                  <Input name="telefono" type="tel" placeholder="Celular registrado (sin 0 ni 15)" icon="smartphone" value={verificationData.telefono} onChange={handleVerificationDataChange} disabled={isLoading} className="bg-white dark:bg-slate-900" />
              </div>
          )}

          {resetStep === 'reset_password' && (
              <div className="space-y-4 animate-fade-in">
                 <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-100 dark:border-green-800 mb-2">
                     <p className="text-xs text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                         <span className="material-icons !text-sm">check_circle</span>
                         Datos verificados correctamente.
                     </p>
                 </div>
                 <div className="relative">
                    <Input id="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva Contraseña" icon="lock" disabled={isLoading} className="bg-white dark:bg-slate-900" autoFocus />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                        <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                 </div>
                 <Input id="confirm-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetir Contraseña" icon="lock_reset" disabled={isLoading} className="bg-white dark:bg-slate-900" />
              </div>
          )}

          {resetStep === 'success' && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-5 rounded-xl text-center animate-fade-in">
                    <div className="mx-auto bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 w-16 h-16 rounded-full flex items-center justify-center mb-3">
                        <span className="material-icons !text-4xl">check</span>
                    </div>
                    <h3 className="font-bold text-emerald-800 dark:text-emerald-200 mb-2 text-lg">¡Listo!</h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        Tu contraseña ha sido restablecida. Ya puedes iniciar sesión.
                    </p>
               </div>
          )}

          <div className="pt-4 space-y-3">
              {resetStep !== 'success' && (
                  <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold text-base py-3 px-6 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                      {isLoading ? (
                          <><div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div><span>Procesando...</span></>
                      ) : (
                          <span>{resetStep === 'verify' ? 'Validar Identidad' : 'Cambiar Contraseña'}</span>
                      )}
                  </button>
              )}
              
              <button 
                type="button" 
                onClick={() => handleModeChange('login')} 
                className="w-full text-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                  {resetStep === 'success' ? "Ir a Iniciar Sesión" : "Cancelar"}
              </button>
          </div>
      </form>
  );

  return (
    <div className="w-full bg-white dark:bg-slate-950 md:grid md:grid-cols-2 min-h-[85vh] rounded-2xl shadow-2xl shadow-slate-200/40 dark:shadow-black/50 overflow-hidden border border-slate-200/60 dark:border-slate-800">
      <div className="hidden md:flex flex-col justify-between p-8 lg:p-12 bg-gradient-to-br from-slate-50 to-slate-200 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 text-slate-800 dark:text-white relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-3/4 h-3/4 bg-blue-600/10 dark:bg-blue-500/20 rounded-full filter blur-3xl animate-pulse" style={{animationDuration: '8s'}} />
        <div className="absolute -bottom-1/4 -left-1/4 w-3/4 h-3/4 bg-indigo-600/10 dark:bg-indigo-500/20 rounded-full filter blur-3xl animate-pulse" style={{animationDuration: '10s', animationDelay: '2s'}} />
        <div className="relative z-10">
          <div className="flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '0ms' }}><MiPanelLogo className="h-16 w-auto" variant={resolvedTheme} /></div>
          <div className="flex-grow flex flex-col justify-center mt-20">
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter leading-tight animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              Tu Panel<br/>Académico.
            </h1>
            <p className="mt-4 text-slate-600 dark:text-slate-400 text-lg lg:text-xl max-w-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              El portal centralizado para el seguimiento de tus Prácticas Profesionales Supervisadas.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}><UfloLogo className="h-16 w-auto" variant={resolvedTheme} /></div>
      </div>

      <div className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-full dark:bg-[#0B1120]">
        <main className="w-full max-w-md">
            {mode === 'login' || mode === 'register' ? renderLoginRegister() :
             mode === 'migration' ? renderLoginRegister() : // Fallback visual, logic handled inside
             mode === 'recover' ? renderRecover() :
             null
            }
            <div aria-live="assertive" className="mt-4">
              {error && <p className="text-red-600 dark:text-red-400 text-sm text-center pt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-800/50">{error}</p>}
            </div>
        </main>
      </div>
    </div>
  );
};

export default Auth;
