
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
import Button from './Button';

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

  const getDisplayName = () => {
      if (!foundStudent) return '';
      const nombre = foundStudent[FIELD_NOMBRE_SEPARADO_ESTUDIANTES];
      const apellido = foundStudent[FIELD_APELLIDO_SEPARADO_ESTUDIANTES];
      if (nombre && apellido) return toTitleCase(`${nombre} ${apellido}`);
      return toTitleCase(foundStudent[FIELD_NOMBRE_ESTUDIANTES] || '');
  };

  const renderLogin = () => (
    <>
      <div className="text-left mb-10">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Bienvenido
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-base font-medium animate-fade-in-up leading-relaxed" style={{ animationDelay: '200ms' }}>
            Ingresa tus credenciales para acceder.
        </p>
      </div>
      
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="space-y-5 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <Input 
            id="legajo" 
            type="text" 
            value={legajo} 
            onChange={(e) => setLegajo(e.target.value)} 
            placeholder="Número de Legajo" 
            icon="badge" 
            disabled={isLoading} 
            autoComplete="username" 
            autoFocus 
          />
        </div>

        <div className="space-y-5 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
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
                className={`${fieldError === 'password' ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : ''}`} 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10" aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
              <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          
          <div className="flex justify-between items-center px-1">
              <label htmlFor="remember-me" className="flex items-center gap-2.5 cursor-pointer group select-none">
                <div className="relative flex items-center">
                    <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={isLoading} className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 bg-transparent transition-all checked:border-slate-800 checked:bg-slate-800 dark:checked:border-white dark:checked:bg-white" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white dark:text-slate-900 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                        <span className="material-icons !text-[10px] font-bold">check</span>
                    </span>
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Recordarme</span>
              </label>

              <button type="button" onClick={() => setMode('recover')} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                  ¿Olvidaste tu contraseña?
              </button>
          </div>
        </div>
        
        <div className="pt-2 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <button 
            type="submit" 
            disabled={isLoading} 
            className="group w-full relative overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-base py-4 px-6 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/20 hover:-translate-y-0.5 active:scale-95 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
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
        
        <div className="mt-8 flex items-center justify-center pt-6 border-t border-slate-100 dark:border-slate-800 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
            <button
                type="button"
                onClick={() => setMode('register')}
                className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
                ¿No tienes cuenta? <span className="text-blue-600 dark:text-blue-400">Crear una nueva</span>
            </button>
        </div>
      </form>
    </>
  );

  const renderRegister = () => (
    <form onSubmit={handleFormSubmit} className="space-y-6 animate-fade-in-up">
        {registerStep === 1 ? (
            <>
                <div className="text-left mb-8">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Crear Cuenta</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-base leading-relaxed">
                        Ingresa tu legajo para verificar si estás habilitado.
                    </p>
                </div>
                <Input id="legajo" type="text" value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Número de Legajo" icon="badge" disabled={isLoading} autoFocus />
                <div className="pt-2">
                    <Button type="submit" isLoading={isLoading} className="w-full bg-slate-900 text-white hover:bg-slate-800" size="lg">Verificar</Button>
                </div>
            </>
        ) : (
            <>
                <div className="text-left mb-8">
                     <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">¡Hola, {getDisplayName()}!</h2>
                     <p className="text-slate-500 dark:text-slate-400 mt-2 text-base leading-relaxed">
                         Confirma tus datos y crea una contraseña.
                     </p>
                </div>
                <div className="space-y-4">
                    <Input name="dni" type="text" placeholder="DNI (sin puntos)" icon="fingerprint" value={verificationData.dni} onChange={handleVerificationDataChange} disabled={isLoading} inputMode="numeric" autoFocus />
                    <Input name="correo" type="email" placeholder="Correo electrónico" icon="email" value={verificationData.correo} onChange={handleVerificationDataChange} disabled={isLoading} />
                    <Input name="telefono" type="tel" placeholder="Número de Celular" icon="smartphone" value={verificationData.telefono} onChange={handleVerificationDataChange} disabled={isLoading} />
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva Contraseña (mín. 6 caracteres)" icon="lock" disabled={isLoading} />
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar Contraseña" icon="lock" disabled={isLoading} />
                </div>
                <div className="pt-2">
                    <Button type="submit" isLoading={isLoading} className="w-full bg-slate-900 text-white hover:bg-slate-800" size="lg">Crear Cuenta</Button>
                </div>
            </>
        )}
        <div className="text-center">
            <button type="button" onClick={() => setMode('login')} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors p-2">
                Volver a Iniciar Sesión
            </button>
        </div>
    </form>
  );
  
  const renderMigration = () => (
    <form onSubmit={handleFormSubmit} className="space-y-6 animate-fade-in-up">
      {migrationStep === 1 ? (
        <>
            <div className="text-left mb-8">
                 <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Activación</h2>
                 <p className="text-slate-500 dark:text-slate-400 mt-2 text-base leading-relaxed">
                     Valida tu identidad para configurar el nuevo acceso.
                 </p>
            </div>
            <div className="space-y-4">
                <Input name="dni" type="text" placeholder="DNI (sin puntos)" icon="fingerprint" value={verificationData.dni} onChange={handleVerificationDataChange} disabled={isLoading} autoFocus />
                <Input name="correo" type="email" placeholder="Correo registrado" icon="email" value={verificationData.correo} onChange={handleVerificationDataChange} disabled={isLoading} />
            </div>
            <div className="pt-2">
                <Button type="submit" isLoading={isLoading} className="w-full bg-slate-900 text-white hover:bg-slate-800" size="lg">Validar</Button>
            </div>
        </>
      ) : (
        <>
            <div className="text-left mb-8">
                 <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Identidad Verificada</h2>
                 <p className="text-slate-500 dark:text-slate-400 mt-2 text-base leading-relaxed">
                     Crea tu nueva contraseña.
                 </p>
            </div>
            <div className="space-y-4">
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva Contraseña" icon="lock" disabled={isLoading} autoFocus />
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar Contraseña" icon="lock" disabled={isLoading} />
            </div>
             <div className="pt-2">
                <Button type="submit" isLoading={isLoading} className="w-full bg-slate-900 text-white hover:bg-slate-800" size="lg">Establecer</Button>
            </div>
        </>
      )}
       <div className="text-center">
            <button type="button" onClick={() => setMode('login')} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors p-2">
                Cancelar
            </button>
        </div>
    </form>
  );

  const renderRecover = () => (
      <form onSubmit={handleFormSubmit} className="space-y-8 animate-fade-in-up">
           <div className="text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold mb-6 border border-slate-200 dark:border-slate-700">
                  <span className="material-icons !text-sm">lock_reset</span>
                  Recuperación
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Recuperar Acceso
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-base leading-relaxed">
                  {resetStep === 'verify' 
                    ? "Completa los datos para validar tu identidad."
                    : resetStep === 'reset_password'
                    ? "Identidad confirmada. Ingresa tu nueva clave."
                    : "¡Proceso completado con éxito!"
                  }
              </p>
          </div>

          {resetStep === 'verify' && (
              <div className="space-y-4 animate-fade-in">
                  <Input id="rec-legajo" type="text" value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Número de Legajo" icon="badge" disabled={isLoading} />
                  <Input name="dni" type="text" placeholder="DNI" icon="fingerprint" value={verificationData.dni} onChange={handleVerificationDataChange} disabled={isLoading} inputMode="numeric" />
                  <Input name="correo" type="email" placeholder="Correo registrado" icon="email" value={verificationData.correo} onChange={handleVerificationDataChange} disabled={isLoading} />
                  <Input name="telefono" type="tel" placeholder="Celular registrado" icon="smartphone" value={verificationData.telefono} onChange={handleVerificationDataChange} disabled={isLoading} />
              </div>
          )}

          {resetStep === 'reset_password' && (
              <div className="space-y-5 animate-fade-in">
                 <div className="relative">
                    <Input id="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva Contraseña" icon="lock" disabled={isLoading} autoFocus />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10">
                        <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                 </div>
                 <Input id="confirm-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetir Contraseña" icon="lock_reset" disabled={isLoading} />
              </div>
          )}

          {resetStep === 'success' && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-8 rounded-2xl text-center animate-fade-in">
                    <div className="mx-auto bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <span className="material-icons !text-4xl">check</span>
                    </div>
                    <h3 className="font-black text-xl text-slate-900 dark:text-white mb-2">¡Listo!</h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-8 font-medium text-sm">
                        Contraseña actualizada.
                    </p>
                    <button 
                        type="button" 
                        onClick={() => setMode('login')} 
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
                    >
                        Iniciar Sesión
                    </button>
               </div>
          )}

          {resetStep !== 'success' && (
              <div className="pt-2 space-y-4">
                  <Button type="submit" isLoading={isLoading} className="w-full bg-slate-900 text-white hover:bg-slate-800" size="lg">
                      {resetStep === 'verify' ? 'Validar Identidad' : 'Establecer Contraseña'}
                  </Button>
                  <button 
                    type="button" 
                    onClick={() => setMode('login')} 
                    className="w-full text-center text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors p-2"
                  >
                      Cancelar
                  </button>
              </div>
          )}
      </form>
  );

  const renderContent = () => {
    switch(mode) {
      case 'login': return renderLogin();
      case 'register': return renderRegister();
      case 'migration': return renderMigration();
      case 'recover': return renderRecover();
      default: return renderLogin();
    }
  };

  return (
    <div className="w-full min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full h-full flex items-center justify-center relative">
        
        {/* Background Ambience */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-slate-200/50 dark:bg-slate-800/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-100/50 dark:bg-blue-900/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>

        {/* Main Card Container */}
        <div className="w-full max-w-6xl relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[680px] relative z-10 transition-all duration-500 bg-white dark:bg-slate-950/80 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            
                {/* LEFT SIDE: Brand & Visuals */}
                <div className="hidden lg:flex relative flex-col justify-between p-16 z-0 overflow-hidden bg-slate-50 dark:bg-[#0B1120] transition-colors duration-500 border-r border-slate-200 dark:border-slate-800">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
                    <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-blue-100 to-slate-200 dark:from-blue-900/20 dark:to-slate-800/20 rounded-full blur-3xl opacity-60"></div>
                    <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-tr from-indigo-100 to-white dark:from-indigo-900/20 dark:to-slate-900/20 rounded-full blur-3xl opacity-60"></div>
                    
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                            <MiPanelLogo className="h-12 w-auto" variant={resolvedTheme === 'dark' ? 'dark' : 'light'} />
                        </div>

                        <div className="space-y-10">
                            <div className="space-y-6">
                                <h1 className="text-5xl font-black leading-[1.1] tracking-tighter animate-fade-in-up text-slate-900 dark:text-white" style={{ animationDelay: '200ms' }}>
                                    Gestión académica <br/>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">inteligente.</span>
                                </h1>
                                <p className="text-lg leading-relaxed font-medium text-slate-600 dark:text-slate-400 max-w-md animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                                    Centraliza tus prácticas, inscripciones y acreditaciones en una plataforma unificada.
                                </p>
                            </div>
                            
                            <div className="flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                                {[
                                    { icon: 'verified_user', text: 'Gestión 100% Digital' },
                                    { icon: 'insights', text: 'Seguimiento en Tiempo Real' },
                                    { icon: 'support_agent', text: 'Soporte Directo' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm text-blue-600 dark:text-blue-400">
                                            <span className="material-icons !text-sm">{item.icon}</span>
                                        </div>
                                        <span className="text-sm font-semibold">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 pt-8 border-t border-slate-200 dark:border-slate-800 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                UFLO Universidad
                            </p>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: Forms */}
                <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16 relative z-10 bg-white dark:bg-gray-950">
                    <div className="flex lg:hidden justify-center items-center gap-6 mb-10">
                        <UfloLogo className="h-10 w-auto opacity-80 grayscale" variant={resolvedTheme} />
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
                        <MiPanelLogo className="h-10 w-auto" variant={resolvedTheme} />
                    </div>

                    <main className="w-full max-w-sm mx-auto">
                        {renderContent()}
                        
                        <div aria-live="assertive" className="mt-8 min-h-[80px]">
                        {error && (
                             <div className="flex items-start gap-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl shadow-sm animate-shake transition-all duration-300">
                                <div className="p-2 bg-white dark:bg-rose-950 rounded-full text-rose-500 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-900/50 flex-shrink-0">
                                    <span className="material-icons !text-lg">error</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-rose-800 dark:text-rose-200">Atención</h4>
                                    <p className="text-sm text-rose-600 dark:text-rose-300 mt-1 leading-snug font-medium">{error}</p>
                                </div>
                            </div>
                        )}
                        </div>
                    </main>
                    
                    <div className="mt-auto pt-8 text-center lg:hidden">
                        <p className="text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">Facultad de Psicología</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
