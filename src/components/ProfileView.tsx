
import React, { useState, useEffect } from 'react';
import {
  FIELD_NOMBRE_ESTUDIANTES,
  FIELD_LEGAJO_ESTUDIANTES,
  FIELD_DNI_ESTUDIANTES,
  FIELD_CORREO_ESTUDIANTES,
  FIELD_TELEFONO_ESTUDIANTES,
  FIELD_NOTAS_INTERNAS_ESTUDIANTES,
} from '../constants';
import { SkeletonBox } from './Skeletons';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import type { EstudianteFields } from '../types';
import type { UseMutationResult } from '@tanstack/react-query';

const ProfileField: React.FC<{ label: string; value?: string | number | null; icon: string }> = ({ label, value, icon }) => (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
            <span className="material-icons !text-xl">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{value || '---'}</p>
        </div>
    </div>
);

interface ProfileViewProps {
  studentDetails: EstudianteFields | null;
  isLoading: boolean;
  updateInternalNotes: UseMutationResult<any, Error, string, unknown>;
}

const ProfileView: React.FC<ProfileViewProps> = ({ studentDetails, isLoading, updateInternalNotes }) => {
  const { isSuperUserMode, isJefeMode } = useAuth();
  const { subscribeToPush, isPushEnabled } = useNotifications();
  
  const [internalNotes, setInternalNotes] = useState('');
  const [isNotesChanged, setIsNotesChanged] = useState(false);

  useEffect(() => {
    const notes = studentDetails?.[FIELD_NOTAS_INTERNAS_ESTUDIANTES] || '';
    setInternalNotes(notes);
    setIsNotesChanged(false);
  }, [studentDetails]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalNotes(e.target.value);
    setIsNotesChanged(e.target.value !== (studentDetails?.[FIELD_NOTAS_INTERNAS_ESTUDIANTES] || ''));
  };

  const handleSaveNotes = () => {
    if (isNotesChanged) updateInternalNotes.mutate(internalNotes);
  };

  if (isLoading || !studentDetails) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <SkeletonBox key={i} className="h-20 w-full" />)}
        </div>
    );
  }

  const {
    [FIELD_NOMBRE_ESTUDIANTES]: nombre,
    [FIELD_LEGAJO_ESTUDIANTES]: legajo,
    [FIELD_DNI_ESTUDIANTES]: dni,
    [FIELD_CORREO_ESTUDIANTES]: correo,
    [FIELD_TELEFONO_ESTUDIANTES]: telefono,
  } = studentDetails;

  const mailToSubject = `Solicitud de Actualización de Datos - Legajo ${legajo}`;
  const mailToBody = `Hola,\n\nQuisiera solicitar una actualización de mis datos personales.\n\n- Nombre Completo: ${nombre}\n- Legajo: ${legajo}\n\nDatos a actualizar (por favor, completar):\n- DNI: \n- Correo Electrónico: \n- Teléfono: \n\nAdjunto la documentación respaldatoria si es necesario.\n\nGracias.`;
  const mailToLink = `mailto:blas.rivera@uflouniversidad.edu.ar?subject=${encodeURIComponent(mailToSubject)}&body=${encodeURIComponent(mailToBody)}`;

  return (
    <div className="space-y-8 animate-fade-in">
        {/* Grid de Datos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2">
                 <ProfileField label="Nombre Completo" value={nombre} icon="badge" />
             </div>
             <ProfileField label="Legajo" value={legajo} icon="numbers" />
             <ProfileField label="DNI" value={dni} icon="fingerprint" />
             <ProfileField label="Correo Electrónico" value={correo} icon="email" />
             <ProfileField label="Teléfono" value={telefono} icon="phone" />
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
             <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Notificaciones</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Recibe alertas sobre cambios.</p>
                </div>
                <button 
                    onClick={subscribeToPush}
                    disabled={isPushEnabled}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isPushEnabled ? 'bg-emerald-100 text-emerald-700 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
                >
                    {isPushEnabled ? 'Activadas' : 'Activar'}
                </button>
             </div>

             <a
                href={mailToLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 group transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
                <span className="material-icons text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">edit_note</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-300">Solicitar Corrección de Datos</span>
            </a>
        </div>

        {/* Notas Internas (Solo Admin) */}
        {(isSuperUserMode || isJefeMode) && (
            <div className="mt-8 bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center gap-2 mb-4 text-amber-800 dark:text-amber-500">
                    <span className="material-icons">lock</span>
                    <h3 className="font-bold text-sm uppercase tracking-wide">Notas Internas (Privado)</h3>
                </div>
                <textarea
                    value={internalNotes}
                    onChange={handleNotesChange}
                    rows={4}
                    className="w-full text-sm rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900/50 p-4 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                    placeholder="Escribir nota..."
                />
                <div className="mt-3 flex justify-end">
                     <button
                        onClick={handleSaveNotes}
                        disabled={!isNotesChanged || updateInternalNotes.isPending}
                        className="bg-amber-600 text-white font-bold py-2 px-6 rounded-lg text-xs shadow-sm hover:bg-amber-700 disabled:opacity-50 transition-all"
                    >
                        {updateInternalNotes.isPending ? 'Guardando...' : 'Guardar Nota'}
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default ProfileView;
