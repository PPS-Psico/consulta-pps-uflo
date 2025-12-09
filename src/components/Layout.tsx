
import React, { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppHeader from './Header';
import { useModal } from '../contexts/ModalContext';

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const { showModal } = useModal();

    // Rutas que deben ocupar todo el ancho de la pantalla
    const fullWidthRoutes = ['/admin', '/jefe', '/directivo', '/reportero', '/testing'];
    const isFullWidth = fullWidthRoutes.some(route => location.pathname.startsWith(route));

    // Global Error Listener: Catch "Silent Failures"
    useEffect(() => {
        const handleGlobalError = (event: ErrorEvent) => {
            console.error("Global Error Caught:", event.error);
            showModal(
                "Se produjo un error inesperado", 
                `Detalle: ${event.message || 'Error desconocido en la aplicación.'}\n\nPor favor, recarga la página.`
            );
        };

        const handlePromiseRejection = (event: PromiseRejectionEvent) => {
            console.error("Unhandled Rejection Caught:", event.reason);
            const message = event.reason?.message || event.reason || "Error de conexión o lógica asíncrona.";
            showModal(
                "Error de Procesamiento", 
                `Ocurrió un fallo en una operación: ${message}`
            );
        };

        window.addEventListener('error', handleGlobalError);
        window.addEventListener('unhandledrejection', handlePromiseRejection);

        return () => {
            window.removeEventListener('error', handleGlobalError);
            window.removeEventListener('unhandledrejection', handlePromiseRejection);
        };
    }, [showModal]);

    return (
        <div className="flex flex-col min-h-screen">
            <AppHeader />
            <main className={`flex-grow w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-8 ${
                isFullWidth ? '' : 'max-w-7xl mx-auto'
            }`}>
                {children}
            </main>
        </div>
    );
}

export default Layout;
