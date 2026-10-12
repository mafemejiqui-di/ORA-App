// Tipos del equipo y columnas del mapa de puntos. Los datos salen de Supabase (ver data/api.ts).
import type { GenerationId, Role } from "./catalogs";

export type TeamMember = {
  id: string;
  name: string;
  role: Role | null;
  generation: GenerationId | null;
  /** Muestra el triángulo del Tótem junto al nombre. */
  hasTotem: boolean;
};

// ── Mapa de puntos (Inicio) ───────────────────────────────────────────
export type TensionLevel = "none" | "low" | "medium" | "high";

export const DOT_MAP_COLUMNS = [
  { id: "boomers", label: "Boomers" },
  { id: "gen-x", label: "Gen X" },
  { id: "millennials", label: "Mill." },
  { id: "gen-z", label: "Gen Z" },
] as const;
