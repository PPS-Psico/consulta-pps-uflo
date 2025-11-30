
import React, { useState, useMemo } from 'react';
import Input from './Input';
import Button from './Button';
import { normalizeStringForComparison } from '../utils/formatters';

interface PreSolicitudCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  existingInstitutions: string[];
}

const EXCLUDED_INSTITUTIONS = [
  "III Jornada Universitaria de Salud Mental",
  "Relevamiento del Ejercicio Profesional en Psicología"
];

const PreSolicitudCheckModal: React.FC<PreSolicitudCheckModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  existingInstitutions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInstitutions = useMemo(() => {
    // Filter out the specific non-institution items first
    const cleanList = existingInstitutions.filter(inst => 
      !EXCLUDED_INSTITUTIONS.some(excluded => 
        normalizeStringForComparison(inst).includes(normalizeStringForComparison(excluded))
      )
    );

    if (!searchTerm) return cleanList;
    
    const lowerSearch = normalizeStringForComparison(searchTerm);
    return cleanList.filter((inst) =>
      normalizeStringForComparison(inst).includes(lowerSearch)
    );
  }, [existingInstitutions, searchTerm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <span className="material-icons !text-2xl">warning_amber</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Requisitos Previos
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Antes de iniciar una solicitud de autogestión, por favor verifica lo siguiente:
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* Requisito 1: Psicólogo */}
          <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
            <span className="material-icons text-blue-600 dark:text-blue-400 flex-shrink-0">psychology</span>
            <div>
              <h3 className="font-bold text-blue-800 dark:text-blue-200 text-sm">Supervisión Profesional</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Es requisito indispensable que la institución cuente con un <strong>Licenciado/a en Psicología</strong> en planta que pueda ejercer el rol de tutor/a y supervisar tu práctica.
              </p>
            </div>
          </div>

          {/* Requisito 2: Espacios Nuevos */}
          <div className="space-y-3">
            <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span className="material-icons text-emerald-500 !text-lg">new_releases</span>
                    Solo para Nuevos Espacios
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    El objetivo de este trámite es la apertura de convenios en instituciones donde <strong>no tenemos oferta actual</strong>. 
                    Por favor, verifica que la institución que propones <strong>NO</strong> esté en el siguiente listado.
                </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <Input 
                        placeholder="Buscar institución en el listado actual..." 
                        icon="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white dark:bg-slate-900"
                    />
                </div>
                <div className="max-h-48 overflow-y-auto p-2 bg-slate-50/30 dark:bg-slate-900/30">
                    {filteredInstitutions.length > 0 ? (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filteredInstitutions.map((inst, idx) => (
                                <li key={idx} className="text-xs px-3 py-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                    <span className="material-icons !text-sm text-slate-400">apartment</span>
                                    {inst}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-sm text-slate-500 py-4 italic">
                            No se encontraron instituciones con ese nombre en el listado actual.
                        </p>
                    )}
                </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onContinue} icon="arrow_forward">
            Comprendido, Continuar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreSolicitudCheckModal;
