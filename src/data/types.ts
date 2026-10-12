import type { GenerationId, Role } from "./catalogs";

export type Team = {
  id: string;
  name: string;
  /** Código para que otras personas se unan, formato XXXX-XXXX. */
  code: string;
  /** Número del ciclo en curso al cargar la sesión (para el día a día usar getCycleStatus). */
  cycleNumber?: number;
  /** Inicio del ciclo en curso al cargar la sesión. */
  cycleStartedAt?: string | null;
  /** Inicio del ciclo 1 (`teams.cycle_anchor`): de aquí salen todos los ciclos automáticos. */
  firstCycleStartedAt?: string | null;
};

/** Una decisión registrada en "Tomar una decisión" (uso puntual: puede haber varias). */
export type DecisionEntry = {
  tipo: string | null;
  frenos: string[];
  urgencia: string | null;
  savedAt: string;
};

/** Postura de liderazgo que cada persona escribe en el Tótem (privada). */
export type Totem = {
  persona: string;
  equipoSobra: string;
  equipoFalta: string;
  accion: string;
  savedAt: string;
};

/** Un ritual diario completado (privado). Hay una entrada por día; la última gana. */
export type RitualEntry = {
  estado: string | null;
  reflexiones: string[];
  intencion: string | null;
  savedAt: string;
};

/** Respuestas de "Ver cómo estamos" en un ciclo. Una por ciclo; después solo se pueden ver. */
export type DiagnosisEntry = {
  estado: string | null;
  sentir: string | null;
  actitud: string | null;
  savedAt: string;
};

/** Retrospectiva de "Cierre del ciclo". Una por ciclo; después solo se puede ver. */
export type ClosingEntry = {
  comparacion: string | null;
  funciono: string | null;
  intenciones: string[];
  savedAt: string;
};

export type UserSettings = {
  dailyRitualReminder: boolean;
  cycleReminder: boolean;
};

export const DEFAULT_SETTINGS: UserSettings = { dailyRitualReminder: true, cycleReminder: true };

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role | null;
  generation: GenerationId | null;
  teamId: string | null;
  /** Perfil de administradora: ve todos los equipos (profiles.is_admin, se activa desde Supabase). */
  isAdmin?: boolean;
  /** Opcional porque las cuentas guardadas antes de esta fase no lo traen. */
  totem?: Totem | null;
  settings?: UserSettings;
  /** Rituales completados, por fecha local (YYYY-MM-DD). */
  rituals?: Record<string, RitualEntry>;
  /** Diagnósticos de "Ver cómo estamos", por fecha de inicio del ciclo (Team.cycleStartedAt). */
  diagnoses?: Record<string, DiagnosisEntry>;
  /** Decisiones registradas, de la más antigua a la más reciente. */
  decisions?: DecisionEntry[];
  /** Cierres del ciclo, por fecha de inicio del ciclo (Team.cycleStartedAt). */
  closings?: Record<string, ClosingEntry>;
  createdAt: string;
};
