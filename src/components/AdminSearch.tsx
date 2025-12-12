
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/db';
import { 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES, 
} from '../constants';
import type { EstudianteFields, AirtableRecord } from '../types';
import Input from './Input';

const MOCK_STUDENTS_FOR_SEARCH: AirtableRecord<EstudianteFields>[] = [
    { id: 'recTest1', createdTime: '', [FIELD_LEGAJO_ESTUDIANTES]: 'T0001', [FIELD_NOMBRE_ESTUDIANTES]: 'Tester Alfa' } as any,
    { id: 'recTest2', createdTime: '', [FIELD_LEGAJO_ESTUDIANTES]: 'T0002', [FIELD_NOMBRE_ESTUDIANTES]: 'Beta Tester' } as any,
    { id: 'recTest3', createdTime: '', [FIELD_LEGAJO_ESTUDIANTES]: 'T0003', [FIELD_NOMBRE_ESTUDIANTES]: 'Gama Tester' } as any,
];

interface AdminSearchProps {
  onStudentSelect: (student: AirtableRecord<EstudianteFields>) => void;
  onSearchChange?: (term: string) => Promise<void>;
  isTestingMode?: boolean;
}

const AdminSearch: React.FC<AdminSearchProps> = ({ onStudentSelect, onSearchChange, isTestingMode = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<AirtableRecord<EstudianteFields>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const fetchMatches = useCallback(async (term: string) => {
    if (onSearchChange) {
        await onSearchChange(term);
        return;
    }

    if (term.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    
    if (isTestingMode) {
        setTimeout(() => {
            const lowerTerm = term.toLowerCase();
            const filtered = MOCK_STUDENTS_FOR_SEARCH.filter(s => 
                (s[FIELD_NOMBRE_ESTUDIANTES] as string)?.toLowerCase().includes(lowerTerm) || 
                (s[FIELD_LEGAJO_ESTUDIANTES] as string)?.toLowerCase().includes(lowerTerm)
            );
            setResults(filtered);
            setIsLoading(false);
        }, 300);
        return;
    }
    
    // Optimización: Usamos getPage que utiliza la búsqueda nativa de Supabase (ilike)
    const { records, error } = await db.estudiantes.getPage(1, 20, {
        searchTerm: term,
        searchFields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES]
    });
    
    if (!error) {
      setResults(records);
    }
    setIsLoading(false);
  }, [onSearchChange, isTestingMode]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchMatches(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, fetchMatches]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (student: AirtableRecord<EstudianteFields>) => {
    onStudentSelect(student);
    setSearchTerm('');
    setResults([]);
    setIsDropdownOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }
  };

  const showDropdown = isDropdownOpen && searchTerm.length > 0 && !onSearchChange;

  const placeholderText = isTestingMode
    ? "Buscar (ej: Tester Alfa, T0001)"
    : "Buscar por Legajo o Nombre...";

  return (
<<<<<<< HEAD
    <div ref={searchContainerRef} className={`relative w-full max-w-lg mx-auto ${showDropdown ? 'z-[100]' : 'z-auto'}`}>
=======
    <div ref={searchContainerRef} className={`relative w-full max-w-lg mx-auto ${showDropdown ? 'z-50' : 'z-auto'}`}>
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
        <Input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={placeholderText}
            icon="search"
            aria-label="Buscar Estudiante"
            autoComplete="off"
            className="text-base"
        />
        {showDropdown && (
<<<<<<< HEAD
            <div className="absolute z-[100] mt-2 w-full bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200/70 dark:border-slate-700 overflow-hidden max-h-80 overflow-y-auto animate-fade-in-up" style={{ animationDuration: '200ms' }}>
=======
            <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200/70 dark:border-slate-700 overflow-hidden max-h-80 overflow-y-auto animate-fade-in-up" style={{ animationDuration: '200ms' }}>
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
                {isLoading ? (
                    <div className="p-4 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <div className="border-2 border-slate-200 dark:border-slate-600 border-t-blue-500 rounded-full w-5 h-5 animate-spin mr-2"></div>
                        Buscando...
                    </div>
                ) : results.length > 0 ? (
                    <ul>
                        {results.map((student) => (
                            <li key={student.id}>
                                <button
                                    onClick={() => handleSelect(student)}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors flex justify-between items-center"
                                >
                                    <span className="font-medium text-slate-800 dark:text-slate-100">{student[FIELD_NOMBRE_ESTUDIANTES]}</span>
                                    <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{student[FIELD_LEGAJO_ESTUDIANTES]}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                     <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                        No se encontraron resultados para "{searchTerm}".
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default AdminSearch;
