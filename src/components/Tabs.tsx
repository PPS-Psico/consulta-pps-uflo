
import React, { ReactNode, useRef, useState, useLayoutEffect } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: string;
  content: ReactNode;
  isClosable?: boolean;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  className?: string;
  variant?: 'default' | 'segmented';
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTabId, onTabChange, onTabClose, className = '', variant = 'default' }) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({});

  useLayoutEffect(() => {
    if (variant === 'default') {
        const activeTabNode = tabsRef.current?.querySelector(`[data-tab-id="${activeTabId}"]`);
        if (activeTabNode) {
        const { offsetLeft, offsetWidth } = activeTabNode as HTMLElement;
        setIndicatorStyle({
            transform: `translateX(${offsetLeft}px)`,
            width: `${offsetWidth}px`,
        });
        }
    }
  }, [activeTabId, tabs, variant]);

  if (variant === 'segmented') {
    return (
        <div className={className}>
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/50">
                {tabs.map(tab => {
                    const isActive = activeTabId === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                relative flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all duration-200
                                ${isActive 
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                                }
                            `}
                        >
                            {tab.icon && <span className={`material-icons !text-lg ${isActive ? 'text-blue-600 dark:text-blue-400' : 'opacity-70'}`}>{tab.icon}</span>}
                            <span>{tab.label}</span>
                            {tab.badge !== undefined && (
                                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none ${isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            <div className="mt-6">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        role="tabpanel"
                        hidden={activeTabId !== tab.id}
                        className="focus:outline-none animate-fade-in"
                    >
                        {tab.content}
                    </div>
                ))}
            </div>
        </div>
    );
  }

  // Default Variant (Line)
  return (
    <div className={className}>
      <div className="relative border-b border-slate-200 dark:border-slate-800">
        <nav ref={tabsRef} className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map(tab => {
             const isActive = activeTabId === tab.id;
            return (
              <div key={tab.id} data-tab-id={tab.id} className="relative group flex-shrink-0">
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    whitespace-nowrap text-sm transition-colors duration-300
                    flex items-center gap-2 py-4 px-4
                    focus:outline-none 
                    ${
                      isActive
                        ? 'font-bold text-blue-600 dark:text-blue-400'
                        : 'font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }
                    ${tab.isClosable && onTabClose ? 'pr-8' : ''}
                  `}
                >
                  {tab.icon && <span className={`material-icons !text-lg ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>{tab.icon}</span>}
                  <span>{tab.label}</span>
                </button>
                {tab.isClosable && onTabClose && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabClose(tab.id);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <span className="material-icons !text-base">close</span>
                  </button>
                )}
              </div>
            )
          })}
        </nav>
        <div 
           className="absolute bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-300 ease-out z-20"
           style={indicatorStyle}
        />
      </div>
      <div className="pt-6">
        {tabs.map(tab => (
          <div
            key={tab.id}
            hidden={activeTabId !== tab.id}
            className="focus:outline-none animate-fade-in"
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
