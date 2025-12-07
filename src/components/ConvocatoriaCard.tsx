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

  const StatusBadge: React.FC = () => (
    orientacion ? (
      <span className={`${visualStyles.tag} border border-transparent shadow-none px-2 py-0.5 text-[10px] uppercase tracking-wider`}>
        {orientacion}
      </span>
    ) : null
  );

  const LocationInfo: React.FC = () => {
    if (!direccion) return null;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;

    return (
      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
        <span className="material-icons !text-sm opacity-70">location_on</span>
        <span className="truncate max-w-[200px] sm:max-w-[300px]">{direccion}</span>
        {isValidLocation(direccion) && (
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="ml-1 text-blue-500 hover:text-blue-400">
                <span className="material-icons !text-xs">open_in_new</span>
            </a>
        )}
      </div>
    );
  };

  // Botones Compactos
  const InscribirButton: React.FC = () => (
    <button
      onClick={() => onInscribir(lanzamiento)}
      disabled={isEnrolling}
      className={`relative overflow-hidden w-full sm:w-auto font-bold text-xs py-2 px-5 rounded-lg transition-all duration-200 ease-out shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap h-9
        ${isEnrolling
          ? 'bg-slate-400 dark:bg-slate-700 text-white cursor-wait'
          : 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 hover:shadow-blue-500/30 dark:hover:shadow-blue-500/20'
      }`}
    >
      {isEnrolling ? <LoadingSpinner variant="light" /> : <span className="material-icons !text-base">rocket_launch</span>}
      <span>POSTULARME</span>
    </button>
  );

  const CompletedButton: React.FC = () => (
      <button disabled className="w-full sm:w-auto font-bold text-xs py-2 px-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed flex items-center justify-center gap-2 h-9 whitespace-nowrap">
        <span className="material-icons !text-base">history</span>
        <span>Ya Cursada</span>
      </button>
  );

  const VerSeleccionadosButton: React.FC = () => (
    <button
      onClick={() => onVerSeleccionados(lanzamiento)}
      disabled={isVerSeleccionadosLoading}
      className={`w-full sm:w-auto font-bold text-xs py-2 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 h-9 whitespace-nowrap border ${statusInfo.style} ${statusInfo.hover}`}
    >
      {isVerSeleccionadosLoading ? <LoadingSpinner variant="dark" /> : <span className="material-icons !text-base">{statusInfo.icon}</span>}
      <span>{statusInfo.text}</span>
      {!isVerSeleccionadosLoading && <span className="material-icons !text-base opacity-60 ml-1">arrow_forward</span>}
    </button>
  );

  const StatusDisplay: React.FC = () => (
    <div className={`w-full sm:w-auto text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 h-9 whitespace-nowrap border ${statusInfo.style} cursor-default`}>
      <span className="material-icons !text-base">{statusInfo.icon}</span>
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
    <article className="group bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700/50 overflow-hidden relative">
        {/* Side Accent */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${visualStyles.gradient}`}></div>

        <div className="p-4 pl-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-grow min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-1.5">
                    <StatusBadge />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-tight tracking-tighter truncate pr-2" title={nombre || 'Convocatoria'}>
                    {nombre || 'Convocatoria sin nombre'}
                </h3>
                <LocationInfo />
            </div>

            <div className="flex-shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                <ActionButton />
            </div>
        </div>
    </article>
  );
};

export default ConvocatoriaCard;