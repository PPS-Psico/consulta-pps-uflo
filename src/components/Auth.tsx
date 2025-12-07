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

  const inputClasses = `
    w-full bg-slate-50 dark:bg-[#1E293B] border-transparent focus:border-blue-500
    rounded-xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
    focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300
    hover:bg-slate-100 dark:hover:bg-[#334155]
  `;

  const renderLoginRegister = () => (
    <>
      <div className="text-left mb-10">
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Bienvenido
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium animate-fade-in-up leading-relaxed" style={{ animationDelay: '200ms' }}>
            Ingresa tus credenciales para acceder.
        </p>
      </div>
      
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <Input 
            id="legajo" 
            type="text" 
            value={legajo} 
            onChange={(e) => setLegajo(e.target.value)} 
            placeholder="Número de Legajo" 
            icon="badge" 
            disabled={isLoading} 
            autoComplete="username" 
            className={inputClasses}
            wrapperClassName="shadow-none"
            autoFocus 
          />
        </div>

        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="relative">
            <Input 
                id="password" 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Contraseña" 
                icon="lock" 
                disabled={isLoading} 
                autoComplete="current-password" 
                className={`${inputClasses} ${fieldError === 'password' ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : ''}`} 
                wrapperClassName="shadow-none"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10" aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
              <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          
          <div className="flex justify-between items-center px-1">
              <label htmlFor="remember-me" className="flex items-center gap-2.5 cursor-pointer group select-none">
                <div className="relative flex items-center">
                    <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={isLoading} className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 bg-transparent transition-all checked:border-blue-600 checked:bg-blue-600 dark:checked:border-blue-500 dark:checked:bg-blue-500" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                        <span className="material-icons !text-[10px] font-bold">check</span>
                    </span>
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">Recordarme</span>
              </label>

              <button type="button" onClick={() => handleModeChange('recover')} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                  ¿Olvidaste tu contraseña?
              </button>
          </div>
        </div>
        
        <div className="pt-4 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <button 
            type="submit" 
            disabled={isLoading} 
            className="group w-full relative overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg py-4 px-6 rounded-xl transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/20 dark:hover:shadow-blue-400/20 hover:-translate-y-0.5 active:scale-95 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
            <div className="relative flex items-center justify-center gap-3">
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <>
                        <span>Ingresar</span>
                        <span className="material-icons !text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
                    </>
                )}
            </div>
          </button>
        </div>
      </form>
    </>
  );

  const renderRecover = () => (
      <form onSubmit={handleFormSubmit} className="space-y-8 animate-fade-in-up">
           <div className="text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-bold mb-6 border border-amber-100 dark:border-amber-800/50">
                  <span className="material-icons !text-sm">lock_reset</span>
                  Recuperación Segura
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Recuperar Contraseña
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-base leading-relaxed">
                  {resetStep === 'verify' 
                    ? "Validaremos tu identidad con los datos registrados en el sistema."
                    : resetStep === 'reset_password'
                    ? "Identidad confirmada. Ingresa tu nueva clave."
                    : "¡Proceso completado con éxito!"
                  }
              </p>
          </div>

          {resetStep === 'verify' && (
              <div className="space-y-4 animate-fade-in">
                  <Input wrapperClassName="shadow-none" className={inputClasses} id="rec-legajo" type="text" value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Número de Legajo" icon="badge" disabled={isLoading} />
                  <Input wrapperClassName="shadow-none" className={inputClasses} name="dni" type="text" placeholder="DNI (sin puntos)" icon="fingerprint" value={verificationData.dni} onChange={handleVerificationDataChange} disabled={isLoading} inputMode="numeric" />
                  <Input wrapperClassName="shadow-none" className={inputClasses} name="correo" type="email" placeholder="Correo registrado" icon="email" value={verificationData.correo} onChange={handleVerificationDataChange} disabled={isLoading} />
                  <Input wrapperClassName="shadow-none" className={inputClasses} name="telefono" type="tel" placeholder="Celular registrado" icon="smartphone" value={verificationData.telefono} onChange={handleVerificationDataChange} disabled={isLoading} />
              </div>
          )}

          {resetStep === 'reset_password' && (
              <div className="space-y-5 animate-fade-in">
                 <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-3">
                     <div className="bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 p-1.5 rounded-full">
                        <span className="material-icons !text-lg">check</span>
                     </div>
                     <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">
                         Identidad verificada.
                     </p>
                 </div>
                 <div className="relative">
                    <Input wrapperClassName="shadow-none" className={inputClasses} id="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva Contraseña" icon="lock" disabled={isLoading} autoFocus />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10">
                        <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                 </div>
                 <Input wrapperClassName="shadow-none" className={inputClasses} id="confirm-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetir Contraseña" icon="lock_reset" disabled={isLoading} />
              </div>
          )}

          {resetStep === 'success' && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-8 rounded-3xl text-center animate-fade-in">
                    <div className="mx-auto bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <span className="material-icons !text-5xl">check</span>
                    </div>
                    <h3 className="font-black text-2xl text-slate-900 dark:text-white mb-2">¡Contraseña Actualizada!</h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-8 font-medium">
                        Ya puedes acceder a tu panel con tu nueva credencial.
                    </p>
                    <button 
                        type="button" 
                        onClick={() => handleModeChange('login')} 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                    >
                        Iniciar Sesión
                    </button>
               </div>
          )}

          {resetStep !== 'success' && (
              <div className="pt-2 space-y-4">
                  <button type="submit" disabled={isLoading} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg py-4 px-6 rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                      {isLoading ? (
                          <><div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div><span>Procesando...</span></>
                      ) : (
                          <span>{resetStep === 'verify' ? 'Validar Identidad' : 'Establecer Contraseña'}</span>
                      )}
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => handleModeChange('login')} 
                    className="w-full text-center text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors p-2"
                  >
                      Cancelar y Volver
                  </button>
              </div>
          )}
      </form>
  );

  return (
    <div className="w-full min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full h-full flex items-center justify-center relative">
        
        {/* Background Ambience (Aurora Effect) */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>
        <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-purple-400/20 dark:bg-purple-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000 pointer-events-none"></div>

        {/* Main Card Container with pseudo-element for shadow */}
        <div className="w-full max-w-6xl relative before:content-[''] before:absolute before:inset-0 before:rounded-[2.5rem] before:shadow-2xl before:z-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[650px] relative z-10 transition-all duration-500 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            
                {/* LEFT SIDE: Brand & Visuals */}
                <div className={`hidden lg:flex relative flex-col justify-between p-16 z-0 ${
                    resolvedTheme === 'dark' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-gradient-to-br from-[#F8FAFC]/80 via-[#EFF6FF]/80 to-[#E2E8F0]/80 text-slate-900'
                }`}>
                    
                    {/* Subtle Texture */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] mix-blend-overlay pointer-events-none"></div>
                    
                    {/* Content */}
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                            <MiPanelLogo className="h-16 w-auto" variant={resolvedTheme} />
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className={`w-16 h-1.5 rounded-full mb-6 ${resolvedTheme === 'dark' ? 'bg-blue-500/50' : 'bg-blue-600'}`}></div>
                                <h1 className={`text-5xl font-black leading-[1.1] tracking-tighter animate-fade-in-up ${resolvedTheme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`} style={{ animationDelay: '200ms' }}>
                                    Tu futuro profesional,<br/>organizado.
                                </h1>
                            </div>
                            <p className={`text-lg leading-relaxed max-w-md font-medium animate-fade-in-up ${resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} style={{ animationDelay: '300ms' }}>
                                Gestiona tus prácticas, inscripciones y acreditaciones en una plataforma unificada y segura.
                            </p>
                            
                            <div className="flex gap-3 flex-wrap animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                                {['Gestión 100% Digital', 'Seguimiento en Tiempo Real', 'Soporte Directo'].map((tag, i) => (
                                    <span key={i} className={`px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md ${
                                        resolvedTheme === 'dark' 
                                            ? 'bg-white/5 border-white/10 text-slate-300' 
                                            : 'bg-white/60 border-blue-100 text-blue-800 shadow-sm'
                                    }`}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className={`flex items-center justify-between pt-8 border-t animate-fade-in-up ${resolvedTheme === 'dark' ? 'border-white/10' : 'border-slate-200'}`} style={{ animationDelay: '500ms' }}>
                            <p className={`text-xs font-bold uppercase tracking-widest ${resolvedTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                UFLO Universidad
                            </p>
                            <div className="flex gap-3 opacity-40">
                                 <div className={`w-2 h-2 rounded-full ${resolvedTheme === 'dark' ? 'bg-white' : 'bg-slate-400'}`}></div>
                                 <div className={`w-2 h-2 rounded-full ${resolvedTheme === 'dark' ? 'bg-white/50' : 'bg-slate-400/50'}`}></div>
                                 <div className={`w-2 h-2 rounded-full ${resolvedTheme === 'dark' ? 'bg-white/30' : 'bg-slate-400/30'}`}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: Forms */}
                <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16 relative z-10 bg-white/60 dark:bg-[#0F172A]/60">
                    
                    {/* Mobile Header Logo */}
                    <div className="flex lg:hidden justify-center items-center gap-6 mb-12">
                        <UfloLogo className="h-12 w-auto opacity-80 grayscale" variant={resolvedTheme} />
                        <div className="h-10 w-px bg-slate-200 dark:bg-slate-700"></div>
                        <MiPanelLogo className="h-14 w-auto" variant={resolvedTheme} />
                    </div>

                    <main className="w-full max-w-sm mx-auto">
                        {mode === 'login' || mode === 'register' || mode === 'migration' ? renderLoginRegister() : renderRecover()}
                        
                        <div aria-live="assertive" className="mt-8">
                        {error && (
                            <div className="flex items-start gap-4 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-xl animate-shake shadow-sm">
                                <div className="p-1.5 bg-rose-100 dark:bg-rose-800 rounded-full text-rose-600 dark:text-rose-300 mt-0.5">
                                    <span className="material-icons !text-lg">priority_high</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-rose-700 dark:text-rose-300">Error de Acceso</h4>
                                    <p className="text-sm text-rose-600 dark:text-rose-400 mt-0.5 leading-snug">{error}</p>
                                </div>
                            </div>
                        )}
                        </div>
                    </main>
                </div>
            </div>
        </div>

        {/* Footer Credit */}
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400/70 dark:text-slate-700 uppercase tracking-widest">Facultad de Psicología y Ciencias Sociales</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;