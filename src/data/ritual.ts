// Contenido del Ritual diario (preguntas y opciones; las respuestas viven en Supabase).

export type EstadoOption = { emoji: string; label: string };

/** "¿Cómo llegas hoy?" — las mismas cinco opciones que usará "Ver cómo estamos". */
export const ESTADO_OPTIONS: readonly EstadoOption[] = [
  { emoji: "😔", label: "Agotado" },
  { emoji: "😐", label: "Neutro" },
  { emoji: "🙂", label: "Estable" },
  { emoji: "⚡", label: "Activo" },
  { emoji: "🔥", label: "Enfocado" },
];

/** La pregunta cambia con el día de la semana (0 = domingo, igual que Date.getDay). */
const QUESTION_BY_WEEKDAY: Record<number, string> = {
  0: "¿Qué necesitas soltar antes de que empiece la semana?",
  1: "¿Con qué intención arrancas esta semana?",
  2: "¿Qué conversación estás evitando?",
  3: "¿A quién del equipo no has escuchado bien esta semana?",
  4: "¿Qué decisión llevas aplazando?",
  5: "¿Qué funcionó esta semana que vale la pena repetir?",
  6: "¿Qué te llevas de esta semana para liderar mejor la próxima?",
};

export function getQuestionForDate(date: Date) {
  return QUESTION_BY_WEEKDAY[date.getDay()];
}

/** Las opciones no cambian: solo cambia la pregunta. */
export const REFLEXION_OPTIONS: readonly string[] = [
  "No lo he pensado aún",
  "Estoy cargando algo del equipo",
  "Tengo una conversación pendiente",
  "Siento que estoy siendo reactivo",
  "Hay algo que debería delegar",
  "El ritmo del equipo me preocupa",
  "Siento que voy bien",
];

export const INTENCION_OPTIONS: readonly string[] = [
  "Escuchar más",
  "Decidir con más calma",
  "Dar feedback directo",
  "Delegar algo concreto",
  "Sostener el ritmo",
  "Ninguna en particular",
];

/** El ciclo se mide sobre 28 días (4 semanas), como "12 de 28 días" en Figma. */
export const RITUAL_WINDOW_DAYS = 28;
