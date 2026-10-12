// Contenido de "Cierre del ciclo": retrospectiva de cierre (datos simulados).
import type { EstadoOption } from "./ritual";

/** "¿Cómo termino este ciclo comparado con cómo lo empecé?" */
export const COMPARACION_OPTIONS: readonly EstadoOption[] = [
  { emoji: "📉", label: "Peor" },
  { emoji: "😐", label: "Igual" },
  { emoji: "🙂", label: "Algo mejor" },
  { emoji: "⭐", label: "Mejor" },
  { emoji: "🚀", label: "Mucho mejor" },
];

/** "¿Qué funcionó mejor en el equipo este ciclo?" — una sola respuesta. */
export const FUNCIONO_OPTIONS: readonly string[] = [
  "Comunicación",
  "Toma de decisiones",
  "Colaboración generacional",
  "Autonomía",
  "Ritmo de trabajo",
];

/** "¿Qué te llevas al siguiente ciclo?" — hasta INTENCIONES_MAX intenciones. */
export const INTENCIONES_OPTIONS: readonly string[] = [
  "Escuchar más antes de decidir",
  "Delegar con más claridad",
  "Dar feedback más directo",
  "Abrir más decisiones al equipo",
  "Sostener el ritmo que encontramos",
];

export const INTENCIONES_MAX = 2;
