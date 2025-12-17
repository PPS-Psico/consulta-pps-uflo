
import React from 'react';

interface CollapsibleSectionProps {
    title: string;
    count: number;
    children: React.ReactNode;
    defaultOpen?: boolean;
    icon: string;
    iconBgColor: string;
    iconColor: string;
    borderColor: string;
    actions?: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, count, children, defaultOpen = true, icon, iconBgColor, iconColor, borderColor, actions }) => (
    <details className="group/details" open={defaultOpen}>
        <summary className="list-none flex items-center gap-4 cursor-pointer mb-4 p-2 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <div className={`flex-shrink-0 size-10 rounded-lg flex items-center justify-center ${iconBgColor}`}>
                <span className={`material-icons ${iconColor}`}>{icon}</span>
            </div>
            <div className="flex-grow">
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h3>
            </div>
            {actions && <div className="flex-shrink-0">{actions}</div>}
            <span className="text-base font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 h-8 w-8 flex items-center justify-center rounded-full">{count}</span>
            <span className="material-icons text-slate-400 dark:text-slate-500 transition-transform duration-300 group-open/details:rotate-90">chevron_right</span>
        </summary>
        <div className={`pl-4 ml-5 border-l-2 ${borderColor}`}>
            {children}
        </div>
    </details>
);

export default CollapsibleSection;
