import { motion } from "framer-motion";
import React, { ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: string;
  content: ReactNode;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  onTabClose?: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col w-full glass-panel rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative transition-all duration-300 ${className}`}
    >
      {/* --- HEADER: NAVIGATION BAR --- */}
      <div className="flex-shrink-0 px-4 sm:px-8 py-6 border-b border-slate-100 dark:border-slate-800/50 bg-white/80 dark:bg-[#0F172A]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Mobile Dropdown (Visible only on small screens) */}
          <div className="md:hidden relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <span className="material-icons !text-xl">
                {tabs.find((t) => t.id === activeTabId)?.icon || "menu"}
              </span>
            </div>
            <select
              value={activeTabId}
              onChange={(e) => onTabChange(e.target.value)}
              className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white py-3 pl-10 pr-10 rounded-2xl font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
              <span className="material-icons !text-xl">expand_more</span>
            </div>
          </div>

          {/* Desktop Animated Tabs (Premium Segmented Control Look) */}
          <div
            role="tablist"
            className="hidden md:flex p-1.5 bg-slate-100/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 mx-auto relative"
          >
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onTabChange(tab.id)}
                  className={`
                                relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 z-10 outline-none
                                ${isActive ? "text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}
                            `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBackground"
                      className="absolute inset-0 bg-white dark:bg-slate-700/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-none ring-1 ring-black/5 dark:ring-white/10"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <span
                    className={`material-icons !text-lg relative z-10 transition-colors duration-200 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`}
                  >
                    {tab.icon}
                  </span>
                  <span className="relative z-10">{tab.label}</span>

                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`ml-2 flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full text-[10px] shadow-sm relative z-10 transition-colors duration-200 ${isActive ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {onTabClose && (tab as any).isClosable && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onTabClose(tab.id);
                      }}
                      className="ml-2 p-0.5 hover:bg-rose-100 text-slate-400 hover:text-rose-500 rounded-full transition-colors relative z-10"
                    >
                      <span className="material-icons !text-sm">close</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- BODY: CONTENT AREA --- */}
      {/* Reduced min-h from 600px to 300px to fix excessive whitespace on desktop */}
      <div className="flex-grow bg-slate-50/50 dark:bg-[#0B1120]/50 min-h-[300px] w-full relative">
        {/* Render active content with subtle animation */}
        <div className="w-full h-full p-4 sm:p-8">
          {tabs.map((tab) => {
            if (activeTabId !== tab.id) return null;
            return (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full max-w-7xl mx-auto"
              >
                {tab.content}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Tabs;
