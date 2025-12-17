
import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { TabId } from '../types';

interface NavTab {
  id: TabId;
  label: string;
  icon?: string;
  path: string;
}

interface MobileBottomNavProps {
  tabs: NavTab[];
  activeTabId: TabId;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ tabs, activeTabId }) => {
  const navigate = useNavigate();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-[70px] pb-2">
        {tabs.map((tab) => {
          // Fix: Use exact ID match from props instead of pathname startsWith check
          const isActive = tab.id === activeTabId;
          
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              // Critical Fix: Remove the gray tap highlight on mobile
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="relative flex flex-col items-center justify-center w-full h-full group focus:outline-none active:bg-transparent"
            >
              {/* Active Indicator Line - Adjusted top spacing */}
              {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-blue-600 dark:bg-blue-500 rounded-b-lg shadow-sm animate-fade-in z-20"></div>
              )}

              <div className={`transition-all duration-300 ease-out transform ${isActive ? '-translate-y-1' : 'group-hover:-translate-y-0.5'}`}>
                <div className={`p-1.5 rounded-xl transition-colors duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500'}`}>
                     <span className={`material-icons !text-2xl ${isActive ? 'filled' : 'outlined'}`}>{tab.icon}</span>
                </div>
              </div>
              
              <span className={`text-[10px] mt-1 font-bold transition-colors duration-300 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                  {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
