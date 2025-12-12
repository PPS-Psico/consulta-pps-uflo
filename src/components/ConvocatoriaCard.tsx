
import React, { useMemo, useCallback } from 'react';
import type { LanzamientoPPS } from '../types';
import {
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
} from '../constants';
import { getEspecialidadClasses, getStatusVisuals, normalizeStringForComparison, isValidLocation } from '../utils/formatters';
import { useModal } from '../contexts/ModalContext';

interface ConvocatoriaCardProps {
  lanzamiento: LanzamientoPPS;
  onInscribir: (lanzamiento: LanzamientoPPS) => void;
  onVerSeleccionados: (lanzamiento: LanzamientoPPS) => void;
  enrollmentStatus: string | null;
  isVerSeleccionadosLoading: boolean;
  isCompleted: boolean;
  userGender?: 'Varon' | 'Mujer' | 'Otro';
  direccion?: string;
}

type StatusInfo = {
  text: string;
  icon: string;
  style: string;
  hover: string;
};

type ConvocatoriaState = 'abierta' | 'cerrada' | 'unknown';
type EnrollmentState = 'seleccionado' | 'inscripto' | 'no_seleccionado' | 'none';

const ConvocatoriaCard: React.FC<ConvocatoriaCardProps> = ({ 
  lanzamiento, 
  onInscribir, 
  onVerSeleccionados, 
  enrollmentStatus, 
  isVerSeleccionadosLoading,
  isCompleted,
  userGender,
  direccion
}) => {
  const { isSubmittingEnrollment, selectedLanzamientoForEnrollment } = useModal();
  const isEnrolling = isSubmittingEnrollment && selectedLanzamientoForEnrollment?.id === lanzamiento.id;

  const {
    [FIELD_NOMBRE_PPS_LANZAMIENTOS]: nombre,
    [FIELD_ORIENTACION_LANZAMIENTOS]: orientacion,
    [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: estadoConvocatoria,
  } = lanzamiento;

  const convocatoriaState = useMemo((): ConvocatoriaState => {
    const normalized = normalizeStringForComparison(estadoConvocatoria);
    if (normalized === 'abierta' || normalized === 'abierto') return 'abierta';
    if (normalized === 'cerrado') return 'cerrada';
    return 'unknown';
  }, [estadoConvocatoria]);

  const enrollmentState = useMemo((): EnrollmentState => {
    if (!enrollmentStatus) return 'none';
    const normalized = normalizeStringForComparison(enrollmentStatus);
    
    if (normalized.includes('no seleccionado')) return 'no_seleccionado';
    if (normalized.includes('seleccionado')) return 'seleccionado';
    if (normalized.includes('inscripto')) {
        if (convocatoriaState === 'cerrada') {
            return 'no_seleccionado';
        }
        return 'inscripto';
    }
    return 'none';
  }, [enrollmentStatus, convocatoriaState]);

  const visualStyles = useMemo(() => getEspecialidadClasses(orientacion), [orientacion]);
  const convocatoriaStatusVisuals = useMemo(() => getStatusVisuals(estadoConvocatoria), [estadoConvocatoria]);

  const getGenderedText = useCallback((masculino: string, femenino: string): string => {
    return userGender === 'Mujer' ? femenino : masculino;
  }, [userGender]);

  const statusInfo = useMemo((): StatusInfo => {
    if (enrollmentState !== 'none') {
        const statusMap: Record<Exclude<EnrollmentState, 'none'>, StatusInfo> = {
            seleccionado: {
                text: getGenderedText('Seleccionado', 'Seleccionada'),
                icon: 'verified',
                style: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
                hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-500/30'
            },
            inscripto: {
                text: getGenderedText('Inscripto', 'Inscripta'),
                icon: 'how_to_reg',
                style: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
                hover: 'hover:bg-sky-200 dark:hover:bg-sky-500/30'
            },
            no_seleccionado: {
                text: `No ${getGenderedText('seleccionado', 'seleccionada')}`,
                icon: 'cancel',
                style: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
                hover: 'hover:bg-rose-200 dark:hover:bg-rose-500/30'
            }
        };
        return statusMap[enrollmentState];
    }
    
    return {
      text: estadoConvocatoria || 'Cerrada',
      icon: convocatoriaStatusVisuals.icon,
      style: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      hover: ''
    };
  }, [enrollmentState, estadoConvocatoria, convocatoriaStatusVisuals, getGenderedText]);

  const LoadingSpinner: React.FC<{ variant?: 'light' | 'dark' }> = ({ variant = 'light' }) => (
    <div 
      className={`border-2 rounded-full w-4 h-4 animate-spin ${
        variant === 'light' 
          ? 'border-white/50 border-t-white' 
          : 'border-current/50 border-t-current'
      }`} 
    />
  );

  const LocationInfo: React.FC = () => {
    if (!direccion) return null;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;

    return (
      <div className="flex items-start gap-1.5 text-sm text-slate-500 dark:text-slate-400 font-medium mt-3">
        <span className="material-icons !text-lg text-slate-400 mt-0.5">location_on</span>
        <span className="line-clamp-1 flex-1">{direccion}</span>
        {isValidLocation(direccion) && (
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:text-blue-600 dark:text-blue-400 transition-colors" title="Ver en mapa">
                <span className="material-icons !text-sm">open_in_new</span>
            </a>
        )}
      </div>
    );
  };

  // --- ACCIONES ---

  const InscribirButton: React.FC = () => (
    <button
      onClick={() => onInscribir(lanzamiento)}
      disabled={isEnrolling}
      className={`w-full md:w-auto relative overflow-hidden font-bold text-sm py-3 px-8 rounded-xl transition-all duration-300 ease-out shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap
        ${isEnrolling
          ? 'bg-slate-400 dark:bg-slate-700 text-white cursor-wait'
          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30 hover:shadow-blue-500/40'
      }`}
    >
      {isEnrolling ? <LoadingSpinner variant="light" /> : <span className="material-icons !text-lg">rocket_launch</span>}
      <span>POSTULARME</span>
    </button>
  );

  const CompletedButton: React.FC = () => (
      <button disabled className="w-full md:w-auto font-bold text-sm py-3 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap">
        <span className="material-icons !text-lg">history</span>
        <span>Ya Cursada</span>
      </button>
  );

  const VerSeleccionadosButton: React.FC = () => (
    <button
      onClick={() => onVerSeleccionados(lanzamiento)}
      disabled={isVerSeleccionadosLoading}
      className={`w-full md:w-auto font-bold text-sm py-3 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 whitespace-nowrap border active:scale-95 ${statusInfo.style} ${statusInfo.hover}`}
    >
      {isVerSeleccionadosLoading ? <LoadingSpinner variant="dark" /> : <span className="material-icons !text-lg">{statusInfo.icon}</span>}
      <span>{statusInfo.text}</span>
      {!isVerSeleccionadosLoading && <span className="material-icons !text-lg opacity-60 ml-1">arrow_forward</span>}
    </button>
  );

  const StatusDisplay: React.FC = () => (
    <div className={`w-full md:w-auto text-sm font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap border ${statusInfo.style} cursor-default opacity-90`}>
      <span className="material-icons !text-lg">{statusInfo.icon}</span>
      <span>{statusInfo.text}</span>
    </div>
  );

  const ActionButton: React.FC = () => {
      if (isCompleted) return <CompletedButton />;
      if (enrollmentState === 'seleccionado' || enrollmentState === 'no_seleccionado') return <VerSeleccionadosButton />;
      if (convocatoriaState === 'cerrada') return <VerSeleccionadosButton />;
      if (convocatoriaState === 'abierta' && enrollmentState === 'none') return <InscribirButton />;
      return <StatusDisplay />;
  };

  return (
    <div className="relative group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1 overflow-hidden">
         
         {/* Background Glow Effect - Subtle ambience based on orientation color */}
         <div 
            className={`absolute -right-20 -top-20 w-64 h-64 rounded-full bg-gradient-to-br ${visualStyles.gradient} opacity-0 group-hover:opacity-5 dark:group-hover:opacity-10 blur-3xl transition-opacity duration-700 pointer-events-none`} 
         />
         
         {/* Integrated Side Bar - Absolute positioned to cut cleanly through border radius */}
         <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${visualStyles.gradient}`}></div>
         
         <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between p-6 pl-8">
            <div className="flex-1 min-w-0 w-full">
               
               {/* Title */}
               <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight tracking-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {nombre || 'Convocatoria sin nombre'}
               </h3>
               
               {/* Location */}
               <LocationInfo />
            </div>

            {/* Action Button Area */}
            <div className="w-full md:w-auto flex-shrink-0 pt-2 md:pt-0 flex items-center justify-start md:justify-end">
               <ActionButton /> 
            </div>
         </div>
    </div>
  );
};

export default ConvocatoriaCard;
