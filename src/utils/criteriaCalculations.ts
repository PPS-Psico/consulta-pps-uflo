import { Practica, Orientacion, CriteriosCalculados } from '../types';
import { 
  FIELD_HORAS_PRACTICAS,
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_ESTADO_PRACTICA
} from '../constants';
import { normalizeStringForComparison } from './formatters';

// Valores por defecto para inicialización, pero los cálculos reales usarán los argumentos
const DEFAULT_HORAS_TOTAL = 250;
const DEFAULT_HORAS_ORIENTACION = 70;

export const initialCriterios: CriteriosCalculados = {
    horasTotales: 0,
    horasFaltantes250: DEFAULT_HORAS_TOTAL,
    cumpleHorasTotales: false,
    horasOrientacionElegida: 0,
    horasFaltantesOrientacion: DEFAULT_HORAS_ORIENTACION,
    cumpleHorasOrientacion: false,
    orientacionesCursadasCount: 0,
    orientacionesUnicas: [],
    cumpleRotacion: false,
    tienePracticasPendientes: false,
};

export interface CalculationConfig {
    horasObjetivoTotal: number;
    horasObjetivoOrientacion: number;
    rotacionObjetivo: number;
}

export const calculateCriterios = (
  allPracticas: Practica[], 
  selectedOrientacion: Orientacion | "",
  config: CalculationConfig
): CriteriosCalculados => {
  if (allPracticas.length === 0) return {
      ...initialCriterios,
      horasFaltantes250: config.horasObjetivoTotal,
      horasFaltantesOrientacion: config.horasObjetivoOrientacion
  };

  const horasTotales = allPracticas.reduce((acc, p) => acc + (p[FIELD_HORAS_PRACTICAS] || 0), 0);
  const cumpleHorasTotales = horasTotales >= config.horasObjetivoTotal;

  const orientacionesUnicas = [...new Set(allPracticas.map(p => p[FIELD_ESPECIALIDAD_PRACTICAS]).filter(Boolean))] as string[];
  const cumpleRotacion = orientacionesUnicas.length >= config.rotacionObjetivo;
  
  let horasOrientacionElegida = 0;
  if (selectedOrientacion) {
    horasOrientacionElegida = allPracticas
      .filter(p => normalizeStringForComparison(p[FIELD_ESPECIALIDAD_PRACTICAS]) === normalizeStringForComparison(selectedOrientacion))
      .reduce((acc, p) => acc + (p[FIELD_HORAS_PRACTICAS] || 0), 0);
  }
  const cumpleHorasOrientacion = horasOrientacionElegida >= config.horasObjetivoOrientacion;

  // Verificar si hay prácticas activas (En curso)
  const tienePracticasPendientes = allPracticas.some(p => {
      const estado = normalizeStringForComparison(p[FIELD_ESTADO_PRACTICA]);
      return estado === 'en curso' || estado === 'pendiente' || estado === 'en proceso';
  });

  return {
    horasTotales,
    cumpleHorasTotales,
    horasOrientacionElegida,
    cumpleHorasOrientacion,
    orientacionesCursadasCount: orientacionesUnicas.length,
    orientacionesUnicas,
    cumpleRotacion,
    horasFaltantes250: Math.max(0, config.horasObjetivoTotal - horasTotales),
    horasFaltantesOrientacion: Math.max(0, config.horasObjetivoOrientacion - horasOrientacionElegida),
    tienePracticasPendientes
  };
};