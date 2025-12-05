
import React, { useState, useMemo, useEffect } from 'react';
import type { LanzamientoPPS } from '../types';
import {
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_ESTADO_GESTION_LANZAMIENTOS,
  FIELD_NOTAS_GESTION_LANZAMIENTOS,
  FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS
} from '../constants';
import { getEspecialidadClasses, formatDate, parseToUTCDate } from '../utils/formatters';

const GESTION_STATUS_OPTIONS = ['Pendiente de Gestión', 'En Conversación', 'Relanzamiento Confirmado', 'No se Relanza', 'Archivado'];

interface GestionCardProps {
  pps: LanzamientoPPS;
  onSave: (id: string, updates: Partial<LanzamientoPPS>) => Promise<boolean>;
  isUpdating: boolean;
  cardType: 'activasYPorFinalizar' | 'finalizadasParaReactivar' | 'relanzamientosConfirmados' | 'activasIndefinidas';
  institution?: { id: string; phone?: string };
  onSavePhone: (institutionId: string, phone: string) => Promise<boolean>;
}

const GestionCard: React.FC<GestionCardProps> = React.memo(({ pps, onSave, isUpdating, cardType, institution, onSavePhone }) => {
  const [status, setStatus] = useState(pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] || 'Pendiente de Gestión');
  const [notes, setNotes] = useState(pps[FIELD_NOTAS_GESTION_LANZAMIENTOS] || '');
  const [isJustSaved, setIsJustSaved] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const especialidadVisuals = getEspecialidadClasses(pps[FIELD_ORIENTACION_LANZAMIENTOS]); 
  
  useEffect(() => {
    setStatus(pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] || 'Pendiente de Gestión');
    setNotes(pps[FIELD_NOTAS_GESTION_LANZAMIENTOS] || '');
  }, [pps]);

  const hasChanges = useMemo(() => {
    const originalStatus = pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] || 'Pendiente de Gestión';
    const originalNotes = pps[FIELD_NOTAS_GESTION_LANZAMIENTOS] || '';
    return status !== originalStatus || notes !== originalNotes;
  }, [status, notes, pps]);

  const handleSave = async () => {
    if (!hasChanges) return;
    const updates: Partial<LanzamientoPPS> = {
      [FIELD_ESTADO_GESTION_LANZAMIENTOS]: status,
      [FIELD_NOTAS_GESTION_LANZAMIENTOS]: notes,
    };
    setIsJustSaved(true); 
    const success = await onSave(pps.id, updates);
    if (success) {
      setTimeout(() => setIsJustSaved(false), 2000);
    } else {
        setIsJustSaved(false);
    }
  };

  const handleWhatsAppClick = () => {
    if (!institution?.phone) return;
    const cleanPhone = institution.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSavePhone = async () => {
    if (!institution || !newPhone.trim()) return;
    const success = await onSavePhone(institution.id, newPhone.trim());
    if (success) {
      setIsEditingPhone(false);
      setNewPhone('');
    }
  };
  
  const timeBadge = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (cardType === 'activasIndefinidas') {
        return { text: 'Sin fecha fin', color: 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400', icon: 'hourglass_empty' };
    }

    if (cardType === 'activasYPorFinalizar') {
        const endDate = parseToUTCDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS]);
        if (!endDate) return null;
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return null;
        if (diffDays === 0) return { text: 'Termina hoy', color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300', icon: 'event_busy' };
        
        const text = `${diffDays} días restan`;
        if (diffDays <= 30) return { text, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300', icon: 'timelapse' };
        return { text, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300', icon: 'event' };
    }

    if (cardType === 'finalizadasParaReactivar') {
        return { text: `Fin: ${formatDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS])}`, color: 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400', icon: 'history' };
    }
    
    if (cardType === 'relanzamientosConfirmados') {
        const relaunchDateValue = pps[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]; 
        const text = relaunchDateValue ? `Relanza ${formatDate(relaunchDateValue)}` : 'Confirmado';
        return { text, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300', icon: 'rocket_launch' };
    }
    return null;
  }, [pps, cardType]);

  const isEnConversacion = status === 'En Conversación';
  const cupos = pps[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS];

  return (
    <div className={`group flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${isEnConversacion ? 'border-sky-400 dark:border-sky-500 ring-1 ring-sky-100 dark:ring-sky-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
        
        {/* Borde superior de color según especialidad */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${especialidadVisuals.gradient}`}></div>

        {/* Header */}
        <div className="px-5 pt-4 pb-2">
            <div className="flex justify-between items-start gap-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 min-h-[1.5em]" title={pps[FIELD_NOMBRE_PPS_LANZAMIENTOS]}>
                    {pps[FIELD_NOMBRE_PPS_LANZAMIENTOS]}
                </h4>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md border ${especialidadVisuals.tag.replace('rounded-full', 'rounded-md')}`}>
                    {pps[FIELD_ORIENTACION_LANZAMIENTOS]?.substring(0, 4).toUpperCase()}
                </span>
            </div>
            
            <div className="flex items-center gap-2 mt-3 flex-wrap">
                {timeBadge && (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${timeBadge.color}`}>
                        <span className="material-icons !text-xs">{timeBadge.icon}</span>
                        {timeBadge.text}
                    </span>
                )}
                {cupos != null && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        <span className="material-icons !text-xs">groups</span>
                        {cupos}
                    </span>
                )}
            </div>
        </div>

        {/* Body - Inputs */}
        <div className="px-5 py-3 flex-grow flex flex-col gap-3">
            <div className="space-y-1">
                <label htmlFor={`status-${pps.id}`} className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider ml-1">Estado</label>
                <div className="relative">
                    <select 
                        id={`status-${pps.id}`} 
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full text-sm font-medium rounded-lg border-0 bg-slate-100 dark:bg-slate-800/80 py-2 pl-3 pr-8 text-slate-700 dark:text-slate-200 shadow-inner focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                    >
                        {GESTION_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                        <span className="material-icons !text-sm text-slate-400">expand_more</span>
                    </div>
                </div>
            </div>
            
            <div className="flex-grow">
                 <label htmlFor={`notes-${pps.id}`} className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider ml-1">Notas</label>
                 <textarea 
                    id={`notes-${pps.id}`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3} 
                    className="w-full text-sm rounded-lg border-0 bg-slate-50 dark:bg-slate-800/50 p-3 text-slate-600 dark:text-slate-300 shadow-inner resize-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-slate-400 h-full min-h-[80px]" 
                    placeholder="Notas de gestión..."
                />
            </div>
        </div>

        {/* Footer - Actions */}
        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-2">
             {/* Left: Phone Action */}
             <div className="flex-shrink-0">
                 {isEditingPhone ? (
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800 p-0.5 shadow-sm absolute bottom-14 left-4 z-10 animate-fade-in">
                        <input
                            type="tel"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="Teléfono"
                            className="w-24 px-2 py-1 text-xs border-none bg-transparent focus:ring-0 outline-none"
                            autoFocus
                        />
                        <button onClick={handleSavePhone} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><span className="material-icons !text-sm">check</span></button>
                        <button onClick={() => setIsEditingPhone(false)} className="p-1 rounded text-rose-500 hover:bg-rose-50"><span className="material-icons !text-sm">close</span></button>
                    </div>
                 ) : institution?.phone ? (
                    <button
                        onClick={handleWhatsAppClick}
                        type="button"
                        className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/50 transition-colors flex items-center justify-center"
                        title={`WhatsApp: ${institution.phone}`}
                    >
                        <span className="material-icons !text-lg">chat</span>
                    </button>
                ) : (
                     <button
                        onClick={() => setIsEditingPhone(true)}
                        type="button"
                        className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Agregar Teléfono"
                        disabled={!institution}
                     >
                         <span className="material-icons !text-lg">add_call</span>
                     </button>
                )}
             </div>

             {/* Right: Save Button */}
             <button
                onClick={handleSave}
                disabled={isUpdating || !hasChanges || isJustSaved}
                className={`flex-grow flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold shadow-sm transition-all transform active:scale-95
                    ${isJustSaved
                        ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none cursor-default'
                        : isUpdating
                            ? 'bg-slate-400 text-white cursor-wait'
                            : hasChanges
                                ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-white hover:shadow-md'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                    }
                `}
            >
                {isUpdating ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <span className="material-icons !text-base">{isJustSaved ? 'check' : 'save'}</span>}
                <span>{isJustSaved ? 'Guardado' : 'Guardar'}</span>
            </button>
        </div>
    </div>
  );
});

export default GestionCard;
