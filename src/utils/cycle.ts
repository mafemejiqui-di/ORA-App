import type { Team } from "../data/types";

// Ciclos automáticos (decisión del usuario): el ciclo 1 arranca al crear el equipo, cada ciclo
// dura 3 semanas y el siguiente empieza enseguida. Es la misma cuenta que hace la base de datos.
//   Semana 1: "Ver cómo estamos" (solo aquí)
//   Semana 2: "Tomar una decisión" (destacado; abierto siempre, es de uso puntual)
//   Semana 3: "Cerrar el ciclo" (solo aquí)

export const CYCLE_WEEKS = 3;
export const CYCLE_DAYS = CYCLE_WEEKS * 7;
/** Semana del ciclo que le corresponde a cada módulo. */
export const MODULE_WEEK = { diagnosis: 1, decision: 2, closing: 3 } as const;

const MS_PER_DAY = 86_400_000;

/** Ciclo en curso a partir del inicio del ciclo 1 (`teams.cycle_anchor`). */
export function getCycleWindow(anchor: string, now = new Date()) {
  const anchorMs = Date.parse(anchor);
  const elapsed = Math.max(0, now.getTime() - anchorMs);
  const index = Math.floor(elapsed / (CYCLE_DAYS * MS_PER_DAY));
  const startsMs = anchorMs + index * CYCLE_DAYS * MS_PER_DAY;
  const endsMs = startsMs + CYCLE_DAYS * MS_PER_DAY;
  const dayIndex = Math.floor((now.getTime() - startsMs) / MS_PER_DAY);
  return {
    number: index + 1,
    startsAt: new Date(startsMs).toISOString(),
    endsAt: new Date(endsMs).toISOString(),
    /** Semana del ciclo (1–3). */
    week: Math.min(CYCLE_WEEKS, Math.floor(dayIndex / 7) + 1),
    /** Día del ciclo (1–21). */
    day: Math.min(CYCLE_DAYS, dayIndex + 1),
    /** Días que faltan para que termine el ciclo (y empiece el siguiente). */
    daysLeft: Math.max(1, Math.ceil((endsMs - now.getTime()) / MS_PER_DAY)),
  };
}

export type CycleStatus = ReturnType<typeof getCycleWindow> & {
  diagnosisOpen: boolean;
  closingOpen: boolean;
  /** Días que faltan para que se abra "Cerrar el ciclo" (0 si ya está abierto). */
  daysUntilClosing: number;
};

/** Estado del ciclo del equipo ahora mismo (null si la persona no tiene equipo). */
export function getCycleStatus(team: Team | null, now = new Date()): CycleStatus | null {
  if (!team?.firstCycleStartedAt) return null;
  const window = getCycleWindow(team.firstCycleStartedAt, now);
  const closingStartMs = Date.parse(window.startsAt) + (MODULE_WEEK.closing - 1) * 7 * MS_PER_DAY;
  return {
    ...window,
    diagnosisOpen: window.week === MODULE_WEEK.diagnosis,
    closingOpen: window.week === MODULE_WEEK.closing,
    daysUntilClosing: Math.max(0, Math.ceil((closingStartMs - now.getTime()) / MS_PER_DAY)),
  };
}

/** Número del ciclo en curso del equipo (0 si no tiene). */
export function getTeamCycleNumber(team: Team) {
  return getCycleStatus(team)?.number ?? 0;
}

/** Llave del ciclo en curso para encontrar "Ver cómo estamos" y el cierre ya guardados. */
export function getCycleKey(team: Team | null) {
  return getCycleStatus(team)?.startsAt ?? "sin-ciclo";
}

/** Solo quien tiene el rol de Líder exporta el historial del equipo. */
export function isLeader(role: string | null | undefined) {
  return role === "Líder";
}

/** "1 día" / "3 días". */
export function days(n: number) {
  return `${n} ${n === 1 ? "día" : "días"}`;
}
