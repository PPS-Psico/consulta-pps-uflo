
import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import AppHeader from './Header';

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();

    // Rutas que deben ocupar todo el ancho de la pantalla
    const fullWidthRoutes = ['/admin', '/jefe', '/directivo', '/reportero', '/testing'];
    const isFullWidth = fullWidthRoutes.some(route => location.pathname.startsWith(route));

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
