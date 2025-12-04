
export function addBusinessDays(startDate: Date, days: number): Date {
    let date = new Date(startDate.getTime()); // Creates a copy
    let added = 0;
    while (added < days) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            added++;
        }
    }
    return date;
}

export function getBusinessDaysDiff(startDate: Date, endDate: Date): number {
    // Calculate business days between two dates
    let start = new Date(startDate.getTime());
    start.setHours(0,0,0,0);
    let end = new Date(endDate.getTime());
    end.setHours(0,0,0,0);

    if (start.getTime() === end.getTime()) return 0;

    if (start > end) {
        // If start is after end, calculate negative business days
        let count = 0;
        let curr = new Date(start);
        while (curr > end) {
            curr.setDate(curr.getDate() - 1);
            const dayOfWeek = curr.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
        }
        return -count;
    }
    
    let count = 0;
    let curr = new Date(start);
    while (curr < end) {
        curr.setDate(curr.getDate() + 1);
        const dayOfWeek = curr.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
    }
    return count;
}

export function formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    
    let date: Date;

    // First, try to parse it as is. This works for ISO 8601 formats (YYYY-MM-DD) which Airtable's Date fields provide.
    const initialDate = new Date(dateString);

    // Check if the initial parsing resulted in a valid date.
    if (!isNaN(initialDate.getTime())) {
        date = initialDate;
    } else {
        // If not, try parsing a DD/MM/YYYY format.
        const parts = dateString.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (parts) {
            // parts[1] = day, parts[2] = month, parts[3] = year
            // Note: Month is 0-indexed in JavaScript Date constructor (0 for Jan, 11 for Dec).
            const day = parseInt(parts[1], 10);
            const month = parseInt(parts[2], 10) - 1;
            const year = parseInt(parts[3], 10);
            // Check for valid date components before creating the date object.
            if (year > 1000 && month >= 0 && month < 12 && day > 0 && day <= 31) {
                date = new Date(Date.UTC(year, month, day));
            } else {
                date = new Date('invalid');
            }
        } else {
            date = new Date('invalid');
        }
    }
    
    // Final check if the resulting date is valid.
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    
    // If valid, format and return it.
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC' // Use UTC to avoid off-by-one day errors due to timezone conversion
    });
}

export function getEspecialidadClasses(especialidad?: string): { 
    tag: string; 
    gradient: string; 
    textOnDark: string;
    headerBg: string;
    headerText: string;
    dot: string;
} {
    const baseClasses = "inline-flex items-center font-bold py-1 px-2.5 rounded-md text-xs border";
    const normalizedEspecialidad = normalizeStringForComparison(especialidad);

    const styles = {
        clinica: {
            tag: `${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20`,
            gradient: 'from-emerald-500 to-teal-500',
            textOnDark: 'text-emerald-100',
            headerBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            headerText: 'text-emerald-900 dark:text-emerald-200',
            dot: 'bg-emerald-500',
        },
        educacional: {
            tag: `${baseClasses} bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20`,
            gradient: 'from-sky-500 to-blue-600',
            textOnDark: 'text-sky-100',
            headerBg: 'bg-sky-50 dark:bg-sky-900/20',
            headerText: 'text-sky-900 dark:text-sky-200',
            dot: 'bg-sky-500',
        },
        laboral: {
            tag: `${baseClasses} bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20`,
            gradient: 'from-rose-500 to-red-600',
            textOnDark: 'text-rose-100',
            headerBg: 'bg-rose-50 dark:bg-rose-900/20',
            headerText: 'text-rose-900 dark:text-rose-200',
            dot: 'bg-rose-500',
        },
        comunitaria: {
            tag: `${baseClasses} bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20`,
            gradient: 'from-violet-500 to-purple-600',
            textOnDark: 'text-violet-100',
            headerBg: 'bg-violet-50 dark:bg-violet-900/20',
            headerText: 'text-violet-900 dark:text-violet-200',
            dot: 'bg-violet-500',
        },
        default: {
            tag: `${baseClasses} bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700`,
            gradient: 'from-slate-500 to-gray-600',
            textOnDark: 'text-slate-100',
            headerBg: 'bg-slate-50 dark:bg-slate-800/50',
            headerText: 'text-slate-900 dark:text-slate-200',
            dot: 'bg-slate-500',
        },
    };

    return (styles as any)[normalizedEspecialidad] || styles.default;
}

export function getStatusVisuals(status?: string): { icon: string; iconContainerClass: string; labelClass: string; accentBg: string; } {
    const normalizedStatus = normalizeStringForComparison(status);
    const baseLabel = "inline-flex items-center font-bold px-2.5 py-1 rounded-full text-xs capitalize border";
    const baseIconContainer = "flex-shrink-0 size-11 rounded-xl flex items-center justify-center mr-4 border";

    const states = {
        'convenio realizado': { icon: 'fact_check', color: 'primary' },
        'pps realizada': { icon: 'check_circle', color: 'primary' },
        'finalizada': { icon: 'check_circle', color: 'primary' },
        'realizada': { icon: 'check_circle', color: 'primary' },
        'no se pudo concretar': { icon: 'cancel', color: 'danger' },
        'no seleccionado': { icon: 'cancel', color: 'danger' },
        'en curso': { icon: 'sync', color: 'warning', animation: 'animate-spin [animation-duration:3s]' },
        'en conversaciones': { icon: 'forum', color: 'warning' },
        'realizando convenio': { icon: 'edit_document', color: 'warning' },
        'puesta en contacto': { icon: 'send', color: 'secondary' },
        'abierta': { icon: 'door_open', color: 'success' },
        'abierto': { icon: 'door_open', color: 'success' },
        'seleccionado': { icon: 'verified', color: 'secondary' },
        'inscripto': { icon: 'how_to_reg', color: 'info' },
        'cerrado': { icon: 'lock', color: 'gray' },
        'oculto': { icon: 'visibility_off', color: 'gray' },
        'pendiente': { icon: 'hourglass_empty', color: 'gray' },
        'cargado': { icon: 'verified', color: 'success' },
        'en proceso': { icon: 'pending_actions', color: 'primary' },
    };

    const colorClasses: Record<string, { icon: string, label: string, accentBg: string }> = {
        primary: { 
            icon: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20', 
            label: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20', 
            accentBg: 'bg-blue-500' 
        },
        danger: { 
            icon: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20', 
            label: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20', 
            accentBg: 'bg-rose-500' 
        },
        warning: { 
            icon: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', 
            label: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20', 
            accentBg: 'bg-amber-500' 
        },
        secondary: { 
            icon: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20', 
            label: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20', 
            accentBg: 'bg-violet-500' 
        },
        success: { 
            icon: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', 
            label: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20', 
            accentBg: 'bg-emerald-500' 
        },
        info: { 
            icon: 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20', 
            label: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20', 
            accentBg: 'bg-sky-500' 
        },
        gray: { 
            icon: 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', 
            label: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', 
            accentBg: 'bg-slate-400' 
        },
    };

    for (const key in states) {
        if (normalizedStatus.includes(key)) {
            const state = (states as any)[key];
            const classes = colorClasses[state.color] || colorClasses.gray;
            return {
                icon: state.icon,
                iconContainerClass: `${baseIconContainer} ${classes.icon} ${state.animation || ''}`,
                labelClass: `${baseLabel} ${classes.label}`,
                accentBg: classes.accentBg,
            };
        }
    }

    // --- DEFAULT FALLBACK ---
    return {
        icon: 'help_outline',
        iconContainerClass: `${baseIconContainer} bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700`,
        labelClass: `${baseLabel} bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700`,
        accentBg: 'bg-slate-400',
    };
}


export function normalizeStringForComparison(str?: any): string {
  const value = String(str || '');
  if (!value) return "";
  return value
    .normalize("NFD") // Decompose accented characters into base characters and diacritics
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (e.g. accents)
    .toLowerCase()
    .trim();
}

export function parseToUTCDate(dateString?: string): Date | null {
    if (!dateString || typeof dateString !== 'string') return null;

    const trimmedStr = dateString.trim().split('T')[0]; // Get only the date part
    if (!trimmedStr) return null;

    // Try YYYY-MM-DD format (ISO standard)
    let parts = trimmedStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parts) {
        const [, year, month, day] = parts.map(Number);
        const d = new Date(Date.UTC(year, month - 1, day));
        if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day) {
            return d;
        }
    }

    // Try DD/MM/YYYY or DD-MM-YYYY format
    parts = trimmedStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (parts) {
        const [, day, month, year] = parts.map(Number);
        const d = new Date(Date.UTC(year, month - 1, day));
        if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day) {
            return d;
        }
    }

    return null;
}

export const simpleNameSplit = (fullName: string): { nombre: string; apellido: string } => {
    if (!fullName) return { nombre: '', apellido: '' };
    let nombre = '';
    let apellido = '';
    if (fullName.includes(',')) {
        const parts = fullName.split(',').map(p => p.trim());
        apellido = parts[0] || '';
        nombre = parts[1] || '';
    } else {
        const nameParts = fullName.trim().split(' ').filter(Boolean);
        if (nameParts.length > 1) {
            apellido = nameParts.pop()!;
            nombre = nameParts.join(' ');
        } else {
            nombre = fullName;
        }
    }
    return { nombre, apellido };
};

export function isValidLocation(location?: string): boolean {
    if (!location) {
        return false;
    }
    const normalizedLocation = location.toLowerCase().trim();
    const nonPhysicalKeywords = ['online', 'virtual', 'a distancia', 'remoto', 'no especificada'];
    
    if (nonPhysicalKeywords.some(keyword => normalizedLocation.includes(keyword))) {
        return false;
    }

    if (!/\d/.test(normalizedLocation)) {
        return false;
    }

    return true;
}
