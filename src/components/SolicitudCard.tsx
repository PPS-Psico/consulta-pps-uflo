
import React from 'react';
import type { SolicitudPPS } from '../types';
import { FIELD_EMPRESA_PPS_SOLICITUD, FIELD_ESTADO_PPS, FIELD_ULTIMA_ACTUALIZACION_PPS, FIELD_NOTAS_PPS } from '../constants';
import { formatDate, getStatusVisuals } from '../utils/formatters';

// Helper function to clean Airtable array strings
const cleanValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) return cleanValue(val[0]);
    let str = String(val);
    if (str.startsWith('["') && str.endsWith('"]')) {
        try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed) && parsed.length > 0) return cleanValue(parsed[0]);
        } catch (e) {}
    }
    return str.replace(/[\[\]"]/g, '').trim();
}

interface SolicitudCardProps {
  solicitud: SolicitudPPS;
}

const SolicitudCard: React.FC<SolicitudCardProps> = ({ solicitud }) => {
  const institucionRaw = solicitud[FIELD_EMPRESA_PPS_SOLICITUD];
  const institucion = cleanValue(institucionRaw);

  const statusRaw = solicitud[FIELD_ESTADO_PPS];
  const status = cleanValue(statusRaw);
  
  const notas = solicitud[FIELD_NOTAS_PPS];
  const actualizacion = solicitud[FIELD_ULTIMA_ACTUALIZACION_PPS];
  
  const visuals = getStatusVisuals(status);

  return (
    <div className="group bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg shadow-slate-200/40 dark:shadow-black/20 border border-slate-200/60 dark:border-slate-700/80 flex items-center gap-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className={visuals.iconContainerClass}>
        <span className="material-icons !text-3xl">{visuals.icon}</span>
      </div>
      
      <div className="flex-grow flex flex-col sm:flex-row justify-between sm:items-center min-w-0 gap-4">

        <div className="flex-grow min-w-0">
          <p className="text-slate-900 dark:text-slate-50 font-bold text-lg leading-tight break-words">
            {institucion || 'Institución no especificada'}
          </p>

          {notas && (
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-snug whitespace-normal mt-1 max-w-prose">
              {notas}
            </p>
          )}
          
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-2">
            Actualizado: {formatDate(actualizacion)}
          </p>
        </div>

        <div className="flex-shrink-0 self-start sm:self-center">
          <span className={`${visuals.labelClass} transition-transform group-hover:scale-105`}>
            {status || 'Pendiente'}
          </span>
        </div>

      </div>
    </div>
  );
};

export default SolicitudCard;