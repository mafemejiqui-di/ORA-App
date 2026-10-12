// Catálogos únicos de la app. Los roles salen del registro (Crear cuenta 2) y son
// los mismos que se muestran en Perfil y Equipo.

export const ROLES = [
  "Diseñador Industrial",
  "Practicante",
  "Líder",
  "Diseñador Gráfico",
  "Coordinador",
  "Otro",
] as const;

export type Role = (typeof ROLES)[number];

// label: nombre completo (registro y Perfil) · compact: listas y etiquetas de
// Equipo · short: gráficos con poco espacio.
export const GENERATIONS = [
  { id: "boomers", label: "Boomers", compact: "Boomers", short: "Boomers", range: "1946 – 1964" },
  { id: "gen-x", label: "Generación X", compact: "Gen X", short: "Gen X", range: "1965 – 1980" },
  { id: "millennials", label: "Millennials", compact: "Millennials", short: "Millennials", range: "1981 – 1996" },
  { id: "gen-z", label: "Generación Z", compact: "Gen Z", short: "Gen Z", range: "1997 – 2012" },
] as const;

export type GenerationId = (typeof GENERATIONS)[number]["id"];

export function getGeneration(id: GenerationId | null) {
  return GENERATIONS.find((g) => g.id === id) ?? null;
}
