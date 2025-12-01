

import React, { useState, useEffect } from 'react';
import type { AirtableRecord } from '../types';

interface FieldConfig {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'email' | 'tel' | 'select' | 'checkbox';
    options?: readonly string[] | { value: string; label: string }[];
}

interface TableConfig {
    label: string;
    schema: any;
    fieldConfig: FieldConfig[];
}

interface RecordEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: AirtableRecord<any> | null; // Null for creation mode
    tableConfig: TableConfig;
    onSave: (recordId: string | null, fields: any) => void;
    isSaving: boolean;
}

const RecordEditModal: React.FC<RecordEditModalProps> = ({ isOpen, onClose, record, tableConfig, onSave, isSaving }) => {
    const [formData, setFormData] = useState<any>({});
    const isCreateMode = !record;

    useEffect(() => {
        const initialData: { [key: string]: any } = {};
        tableConfig.fieldConfig.forEach(field => {
            if (isCreateMode) {
                // Set default values for new records
                initialData[field.key] = field.type === 'checkbox' ? false : field.type === 'number' ? 0 : '';
            } else {
                const airtableKey = tableConfig.schema[field.key] || field.key;
                initialData[field.key] = record ? record[airtableKey] : '';
            }
        });
        setFormData(initialData);
    }, [record, tableConfig, isCreateMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checkedValue = (e.target as HTMLInputElement).checked;
        setFormData((prev: any) => ({
            ...prev,
            [name]: isCheckbox ? checkedValue : value,
        }));
    };

    const handleSave = () => {
        onSave(record ? record.id : null, formData);
    };
    
    if (!isOpen) return null;

    const renderField = (field: FieldConfig) => {
        const value = formData[field.key] ?? '';
        const isCheckbox = field.type === 'checkbox';
        const isTextarea = field.type === 'textarea';
        
        const inputClasses = `w-full rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow ${isCheckbox ? 'h-5 w-5 text-blue-600 rounded cursor-pointer' : ''}`;

        if (isTextarea) {
             return (
                <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{field.label}</label>
                    <textarea name={field.key} value={value} onChange={handleChange} rows={3} className={inputClasses} />
                </div>
             );
        }

        if (field.type === 'select') {
            return (
                <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{field.label}</label>
                    <div className="relative">
                        <select name={field.key} value={value} onChange={handleChange} className={`${inputClasses} appearance-none`}>
                            <option value="">Seleccionar...</option>
                            {field.options?.map((opt) => {
                                if (typeof opt === 'string') {
                                    return <option key={opt} value={opt}>{opt}</option>;
                                }
                                return <option key={opt.value} value={opt.value}>{opt.label}</option>;
                            })}
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 pointer-events-none !text-base">expand_more</span>
                    </div>
                </div>
            );
        }

        if (isCheckbox) {
             return (
                 <div className="col-span-1 flex items-center gap-3 mt-4">
                    <input type="checkbox" id={field.key} name={field.key} checked={!!value} onChange={handleChange} className={inputClasses} />
                    <label htmlFor={field.key} className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">{field.label}</label>
                </div>
            );
        }

        return (
            <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{field.label}</label>
                <input type={field.type} name={field.key} value={value} onChange={handleChange} className={inputClasses} />
            </div>
        );
    };
    
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
                            <span className="material-icons !text-xl">{isCreateMode ? 'add' : 'edit'}</span>
                         </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                            {isCreateMode ? 'Nuevo Registro' : 'Editar Registro'}
                            <span className="block text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">{tableConfig.label}</span>
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-icons">close</span>
                    </button>
                </header>
                
                <main className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                        {tableConfig.fieldConfig.map(field => (
                            <React.Fragment key={field.key}>
                                {renderField(field)}
                            </React.Fragment>
                        ))}
                    </div>
                </main>
                
                <footer className="p-5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 rounded-b-xl">
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving} 
                        className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/>
                                <span>Guardando...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-icons !text-base">save</span>
                                <span>Guardar Cambios</span>
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default RecordEditModal;
