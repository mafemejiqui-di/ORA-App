// Contenido de "Ver cómo estamos", el diagnóstico de inicio de cada ciclo (datos simulados).
// La primera pregunta usa las mismas opciones de estado del Ritual diario (ESTADO_OPTIONS).

/** "¿Qué siento en el equipo ahora mismo?" — una sola respuesta. */
export const SENTIR_OPTIONS: readonly string[] = ["Desconexión", "Tensión", "Rutina", "Colaboración", "Motivación"];

/** "¿Qué actitud notas más en el equipo esta semana?" — el sistema identifica el patrón con esta respuesta. */
export const ACTITUD_OPTIONS: readonly string[] = [
  "Así siempre lo hemos hecho",
  "Prefiere resolver solo antes de pedir ayuda",
  "¿Y esto para qué nos sirve?",
  "Le cuesta aceptar decisiones sin explicación",
  "Todo tranquilo por ahora",
];
