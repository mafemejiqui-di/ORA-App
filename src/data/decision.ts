// Contenido de "Tomar una decisión": acompañamiento en tensión, de uso puntual (datos simulados).

/** "¿Qué tipo de decisión estoy enfrentando?" — una sola respuesta. */
export const TIPO_OPTIONS: readonly string[] = ["De equipo", "Estratégica", "De proceso", "Interpersonal", "De recursos"];

/** "¿Qué está frenando la decisión?" — hasta FRENO_MAX respuestas. */
export const FRENO_OPTIONS: readonly string[] = [
  "Falta de información",
  "Tensión generacional",
  "Falta de consenso",
  "Presión de tiempo",
  "Miedo al error",
];

export const FRENO_MAX = 2;

/** "¿Qué tan urgente es esta decisión?" */
export const URGENCIA_OPTIONS: readonly { label: string; detail: string }[] = [
  { label: "Puedo esperar", detail: "Más de una semana" },
  { label: "Esta semana", detail: "En los próximos días" },
  { label: "Hoy", detail: "Es urgente" },
];
