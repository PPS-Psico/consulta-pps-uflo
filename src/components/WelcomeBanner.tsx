
import React, { useState, useEffect } from 'react';
import { EstudianteFields } from '../types';
import { SkeletonBox } from './Skeletons';

interface WelcomeBannerProps {
  studentName?: string;
  studentDetails: EstudianteFields | null;
  isLoading: boolean;
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  studentName,
  isLoading,
}) => {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12 && hour >= 5) setGreeting('Buenos días');
    else if (hour < 20 && hour >= 12) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, []);

  if (isLoading) return <div className="h-32 w-full bg-slate-100 dark:bg-slate-800/50 rounded-3xl animate-pulse" />;

  const firstName = studentName?.split(' ')[0] || 'Estudiante';

  return (
    <div className="relative mb-6 md:mb-8 pt-2 md:pt-4 px-2">
      <div className="flex flex-col gap-0.5 md:gap-1">
        <span className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-lg uppercase tracking-wide">
           Panel Académico
        </span>
        <h1 className="text-6xl sm:text-6xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-none md:leading-tight">
          {greeting}<span className="hidden md:inline">,</span> <br className="md:hidden" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
            {firstName}.
          </span>
        </h1>
      </div>
    </div>
  );
};

export default React.memo(WelcomeBanner);
