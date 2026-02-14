import React, { useState, useEffect } from "react";

const InstallAdminPWA: React.FC = () => {
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar si ya está instalada
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Verificar si es iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    // Capturar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    // Verificar si ya fue instalada previamente
    const checkInstalled = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsInstalled(true);
        setShowInstall(false);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowInstall(false);
    });

    // Mostrar banner después de 3 segundos si no está instalado
    const timer = setTimeout(() => {
      if (!isInstalled && !window.matchMedia("(display-mode: standalone)").matches) {
        setShowInstall(true);
      }
    }, 3000);

    checkInstalled();

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, [isInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Si no hay prompt diferido (ej: ya fue ignorado), intentar instalar de todos modos
      alert(
        "Para instalar:\n\nAndroid: Menú (⋮) → 'Agregar a pantalla de inicio'\n\niOS: Compartir (□↑) → 'Agregar a pantalla de inicio'"
      );
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    // Guardar en localStorage para no mostrar de nuevo en esta sesión
    localStorage.setItem("admin-install-dismissed", Date.now().toString());
  };

  if (isInstalled || !showInstall) return null;

  // Verificar si fue descartado recientemente (menos de 24 horas)
  const dismissed = localStorage.getItem("admin-install-dismissed");
  if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-[9999] md:hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in-up">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="material-icons text-2xl">admin_panel_settings</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm">Instalar Gestión PPS</h3>
          <p className="text-xs text-white/80 mt-0.5">
            Accede rápido a la gestión de instituciones
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="px-3 py-2 text-xs font-medium text-white/70 hover:text-white transition-colors"
          >
            Ahora no
          </button>
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-white text-blue-600 text-xs font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-colors"
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallAdminPWA;
