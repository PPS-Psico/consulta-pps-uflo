import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { TabId } from "../../types";

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
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPressed, setIsPressed] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const index = tabs.findIndex((tab) => tab.id === activeTabId);
    setActiveIndex(index >= 0 ? index : 0);
  }, [activeTabId, tabs]);

  useEffect(() => {
    // Small delay for entrance animation
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handlePress = useCallback((tabId: string) => {
    setIsPressed(tabId);
    setTimeout(() => setIsPressed(null), 150);
  }, []);

  const handleNavigate = useCallback(
    (tab: NavTab, index: number) => {
      handlePress(tab.id);
      if (location.pathname !== tab.path) {
        // Add haptic feedback if available
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }
        navigate(tab.path);
      }
    },
    [navigate, location.pathname, handlePress]
  );

  return (
    <>
      {/* Safe area spacer for iPhone notch */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[80px] bg-white/90 dark:bg-[#0B1120]/95 backdrop-blur-2xl border-t border-slate-200/60 dark:border-slate-800/60 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-full pb-1 relative">
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTabId;
            const isBeingPressed = isPressed === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleNavigate(tab, index)}
                onTouchStart={() => handlePress(tab.id)}
                onTouchEnd={() => setIsPressed(null)}
                style={{ WebkitTapHighlightColor: "transparent" }}
                className="relative flex flex-col items-center justify-center w-full h-full group focus:outline-none active:bg-transparent"
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <div
                    className="absolute -top-1 w-12 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-lg shadow-blue-500/30"
                    style={{
                      animation: "slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                )}

                {/* Icon container with spring animation */}
                <div
                  className={`relative transition-all duration-300 ease-spring ${
                    isActive ? "-translate-y-1" : ""
                  } ${isBeingPressed ? "scale-90" : "scale-100"}`}
                >
                  {/* Active background circle */}
                  <div
                    className={`absolute inset-0 -m-2 rounded-2xl transition-all duration-300 ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/30 scale-100"
                        : "bg-transparent scale-75 opacity-0"
                    }`}
                  />

                  {/* Icon */}
                  <div
                    className={`relative p-2 rounded-xl transition-all duration-300 ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400"
                    }`}
                  >
                    <span
                      className={`material-icons transition-all duration-300 ${
                        isActive ? "!text-[28px] drop-shadow-md" : "!text-[24px]"
                      }`}
                      style={{
                        transform: isBeingPressed ? "scale(0.85)" : "scale(1)",
                        transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                    >
                      {tab.icon}
                    </span>
                  </div>
                </div>

                {/* Label with fade animation */}
                <span
                  className={`text-[10px] font-semibold transition-all duration-300 leading-none mt-0.5 ${
                    isActive
                      ? "text-blue-900 dark:text-blue-100 font-bold"
                      : "text-slate-400 dark:text-slate-500 font-medium"
                  }`}
                  style={{
                    opacity: isActive ? 1 : 0.7,
                    transform: isActive ? "translateY(0)" : "translateY(1px)",
                  }}
                >
                  {tab.label}
                </span>

                {/* Subtle scale effect when pressed */}
                <div
                  className={`absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all duration-150 -z-10 ${
                    isBeingPressed ? "opacity-100 scale-95" : "opacity-0 scale-90"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* CSS for spring easing */}
      <style>{`
        .ease-spring {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(4px) scaleX(0.5);
          }
          to {
            opacity: 1;
            transform: translateY(0) scaleX(1);
          }
        }
      `}</style>
    </>
  );
};

export default MobileBottomNav;
