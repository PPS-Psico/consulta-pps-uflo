import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const index = tabs.findIndex((tab) => tab.id === activeTabId);
    setActiveIndex(index >= 0 ? index : 0);
  }, [activeTabId, tabs]);

  const handleNavigate = useCallback(
    (tab: NavTab) => {
      if (location.pathname !== tab.path) {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(8);
        }
        navigate(tab.path);
      }
    },
    [navigate, location.pathname]
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl" />

      {/* Top Border Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />

      {/* Navigation Content */}
      <div ref={containerRef} className="relative flex items-center justify-around h-[80px] px-2">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleNavigate(tab)}
              className="relative flex flex-col items-center justify-center w-full h-full focus:outline-none"
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="relative flex flex-col items-center">
                {/* Active Glow Effect */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="activeGlow"
                      className="absolute -inset-4 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-xl"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon Container */}
                <motion.div
                  className="relative flex items-center justify-center w-12 h-12"
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -2 : 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                >
                  {/* Active Background Circle */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="activeBackground"
                        className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        style={{
                          boxShadow: "0 8px 20px -4px rgba(59, 130, 246, 0.4)",
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon */}
                  <motion.span
                    className={`material-icons text-2xl relative z-10 ${
                      isActive ? "text-white" : "text-slate-400 dark:text-slate-500"
                    }`}
                    animate={{
                      rotate: isActive ? [0, -10, 10, 0] : 0,
                    }}
                    transition={{
                      rotate: {
                        duration: 0.5,
                        ease: "easeInOut",
                        times: [0, 0.2, 0.4, 0.5],
                      },
                    }}
                  >
                    {tab.icon}
                  </motion.span>
                </motion.div>

                {/* Label */}
                <motion.span
                  className={`text-[11px] font-semibold mt-0.5 ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 font-bold"
                      : "text-slate-400 dark:text-slate-500 font-medium"
                  }`}
                  animate={{
                    opacity: isActive ? 1 : 0.7,
                    y: isActive ? 0 : 2,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {tab.label}
                </motion.span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Dot Indicator Line */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center">
        <motion.div
          className="w-1 h-1 rounded-full bg-blue-500"
          animate={{
            x: (activeIndex - 1.5) * 80,
            scale: 1,
            opacity: 1,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
        />
      </div>
    </div>
  );
};

export default MobileBottomNav;
