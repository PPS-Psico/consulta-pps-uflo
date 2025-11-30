
import React, { useState, useRef, useEffect } from 'react';
import { z } from 'zod';
import Input from './Input';
import Button from './Button';
import Select from './Select';

interface SolicitudPPSFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
}

// Definición del esquema de validación
const solicitudSchema = z.object({
  nombreInstitucion: z.string().min(3, "El nombre de la institución es requerido"),
  localidad: z.string().min(2, "La localidad es requerida"),
  direccion: z.string().min(5, "La dirección es requerida"),
  emailInstitucion: z.string().email("Email inválido").optional().or(z.literal('')),
  telefonoInstitucion: z.string().optional(),
  
  referente: z.string().min(3, "El referente institucional es requerido"),
  tieneConvenio: z.enum(['Sí', 'No', 'No sé']),
  
  nombreTutor: z.string().min(3, "El nombre del Lic. en Psicología es requerido"),
  
  alcance: z.enum(['Individual', 'Grupal']),
  cantidadEstudiantes: z.string().optional(),
  
  descripcion: z.string().min(10, "Por favor describe brevemente las actividades"),
}).superRefine((data, ctx) => {
    if (data.alcance === 'Grupal' && (!data.cantidadEstudiantes || data.cantidadEstudiantes.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['cantidadEstudiantes'],
            message: "Por favor indica la cantidad aproximada",
        });
    }
});

type FormData = z.infer<typeof solicitudSchema>;

const initialData: FormData = {
  nombreInstitucion: '',
  localidad: '',
  direccion: '',
  emailInstitucion: '',
  telefonoInstitucion: '',
  referente: '',
  tieneConvenio: 'No sé',
  nombreTutor: '',
  alcance: 'Individual',
  cantidadEstudiantes: '',
  descripcion: '',
};

const SolicitudPPSForm: React.FC<SolicitudPPSFormProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        setFormData(initialData);
        setErrors({});
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
        setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = solicitudSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: any = {};
      result.error.issues.forEach(issue => {
          if (issue.path[0]) fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Transform data for backend compatibility
      // We map the new fields to existing DB fields to avoid schema migration
      const submissionData = {
          ...result.data,
          // Map 'nombreTutor' to the existing 'contactoTutor' field
          contactoTutor: result.data.nombreTutor,
          // Map 'alcance' + 'cantidad' to the existing 'tipoPractica' field
          tipoPractica: result.data.alcance === 'Individual' 
            ? 'Individual' 
            : `Grupal (${result.data.cantidadEstudiantes} estudiantes)`,
          // Set hardcoded 'Sí' for 'tieneTutor' since it's now a prerequisite
          tieneTutor: 'Sí'
      };

      await onSubmit(submissionData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-start">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <span className="material-icons !text-2xl">add_business</span>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Solicitar Nueva PPS</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Propuesta de institución para autogestión.</p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <span className="material-icons !text-2xl">close</span>
            </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            {/* Section 1: Institution */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Datos de la Institución</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la Institución <span className="text-red-500">*</span></label>
                        <Input name="nombreInstitucion" value={formData.nombreInstitucion} onChange={handleChange} placeholder="Ej: Hospital Zonal..." />
                        {errors.nombreInstitucion && <p className="text-red-500 text-xs mt-1">{errors.nombreInstitucion}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Localidad <span className="text-red-500">*</span></label>
                        <Input name="localidad" value={formData.localidad} onChange={handleChange} placeholder="Ej: Cipolletti" />
                        {errors.localidad && <p className="text-red-500 text-xs mt-1">{errors.localidad}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección Completa <span className="text-red-500">*</span></label>
                        <Input name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Calle y Altura" />
                        {errors.direccion && <p className="text-red-500 text-xs mt-1">{errors.direccion}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de Contacto</label>
                        <Input name="emailInstitucion" type="email" value={formData.emailInstitucion} onChange={handleChange} placeholder="contacto@institucion.com" />
                         {errors.emailInstitucion && <p className="text-red-500 text-xs mt-1">{errors.emailInstitucion}</p>}
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                        <Input name="telefonoInstitucion" type="tel" value={formData.telefonoInstitucion} onChange={handleChange} placeholder="Cod. Área + Número" />
                    </div>
                </div>
            </div>

            {/* Section 2: Contact & Agreement */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Referentes y Convenio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referente Institucional (Director/Coord) <span className="text-red-500">*</span></label>
                        <Input name="referente" value={formData.referente} onChange={handleChange} placeholder="Autoridad de la institución" />
                        {errors.referente && <p className="text-red-500 text-xs mt-1">{errors.referente}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">¿Tiene convenio con UFLO?</label>
                        <Select name="tieneConvenio" value={formData.tieneConvenio} onChange={handleChange}>
                            <option value="No sé">No lo sé</option>
                            <option value="Sí">Sí, tiene convenio vigente</option>
                            <option value="No">No, hay que gestionarlo</option>
                        </Select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Lic. en Psicología (Tutor) <span className="text-red-500">*</span></label>
                        <Input name="nombreTutor" value={formData.nombreTutor} onChange={handleChange} placeholder="Nombre del profesional que supervisará" />
                        <p className="text-xs text-slate-400 mt-1">Debe ser un psicólogo/a graduado que trabaje en la institución.</p>
                        {errors.nombreTutor && <p className="text-red-500 text-xs mt-1">{errors.nombreTutor}</p>}
                    </div>
                </div>
            </div>

            {/* Section 3: Practice Details */}
             <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Sobre la Práctica</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alcance de la Práctica</label>
                            <Select name="alcance" value={formData.alcance} onChange={handleChange}>
                                <option value="Individual">Solo para mí</option>
                                <option value="Grupal">Para varios estudiantes</option>
                            </Select>
                        </div>
                        {formData.alcance === 'Grupal' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cantidad aprox. de estudiantes <span className="text-red-500">*</span></label>
                                <Input name="cantidadEstudiantes" value={formData.cantidadEstudiantes} onChange={handleChange} placeholder="Ej: 3 o 4" />
                                {errors.cantidadEstudiantes && <p className="text-red-500 text-xs mt-1">{errors.cantidadEstudiantes}</p>}
                            </div>
                        )}
                    </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción de Actividades <span className="text-red-500">*</span></label>
                        <textarea 
                            name="descripcion" 
                            value={formData.descripcion} 
                            onChange={handleChange} 
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 p-3 text-sm bg-white dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Describe brevemente qué actividades se realizarían (ej: observación, admisión, talleres)..."
                        />
                        {errors.descripcion && <p className="text-red-500 text-xs mt-1">{errors.descripcion}</p>}
                    </div>
                </div>
             </div>

        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={isSubmitting} icon="send">Enviar Solicitud</Button>
        </div>
      </div>
    </div>
  );
};

export default SolicitudPPSForm;
