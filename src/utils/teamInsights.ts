// Indicadores para la administradora: uso diario de la app, diferencias entre integrantes,
// alertas de quién no la usa y temas de tensión de la semana.
//
// Todo sale de los datos reales que entrega la base de datos (AdminSnapshot, ver
// get_admin_overview en 02_patterns.sql), sin exponer registros privados.
import type { AdminSnapshot } from "../data/api";
import { getGeneration, type GenerationId } from "../data/catalogs";
import { ESTADO_OPTIONS } from "../data/ritual";
import type { TeamMember } from "../data/teamData";
import type { Team } from "../data/types";
import { toLocalIso } from "./ritual";

const MS_PER_DAY = 86_400_000;
/** Días sin usar la app a partir de los cuales se genera una alerta. */
export const INACTIVE_ALERT_DAYS = 3;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export type UsageDay = {
  iso: string;
  date: Date;
  active: number;
  total: number;
  /** Porcentaje de integrantes que usaron la app ese día (0–100). */
  percent: number;
  /** Diferencia entre integrantes: desviación de sus estados ese día (0 = todos igual). */
  spread: number;
  /** Uno de los días con más diferencias del periodo. */
  flagged: boolean;
  /** La diferencia más marcada ese día: los dos grupos (o personas) con estados más distintos. */
  difference: Difference | null;
};

export type Difference = {
  low: { who: string; estado: string };
  high: { who: string; estado: string };
};

/** Diferencia mínima (en pasos de estado, 1–5) para considerarla marcada. */
const MARKED_GAP = 1;

const estadoLabel = (score: number) => ESTADO_OPTIONS[Math.min(4, Math.max(0, Math.round(score) - 1))].label;

/**
 * Compara cómo llegó cada generación ese día (promedio de sus estados, que la base de datos solo
 * entrega para generaciones con 3+ personas). Devuelve el par más distante, o null si no lo hay.
 * Nunca compara personas: los estados individuales son privados.
 */
function markedDifference(generations: { generation: GenerationId; avg: number }[]): Difference | null {
  const groups = generations.map((g) => ({ who: getGeneration(g.generation)?.compact ?? g.generation, score: g.avg }));
  if (groups.length < 2) return null;

  const low = groups.reduce((a, b) => (b.score < a.score ? b : a));
  const high = groups.reduce((a, b) => (b.score > a.score ? b : a));
  if (high.score - low.score < MARKED_GAP) return null;
  return {
    low: { who: low.who, estado: estadoLabel(low.score) },
    high: { who: high.who, estado: estadoLabel(high.score) },
  };
}

export type InactiveAlert = {
  member: TeamMember;
  team: Team;
  /** Días desde el último uso; null si no lo ha usado en todo el periodo. */
  daysInactive: number | null;
};

export type UsageReport = {
  days: UsageDay[];
  alerts: InactiveAlert[];
  members: number;
  activeToday: number;
};

/** Uso diario de los equipos indicados durante los últimos `windowDays` días (hoy incluido). */
export function getUsageReport(snapshot: AdminSnapshot, teams: Team[], windowDays = 14, now = new Date()): UsageReport {
  const roster = teams.flatMap((team) =>
    (snapshot.members[team.id] ?? []).map((member) => ({ team, member, activity: new Set(snapshot.activity[member.id] ?? []) })),
  );

  const days: UsageDay[] = [];
  const lastActive = new Map<string, number>();
  for (let daysAgo = windowDays - 1; daysAgo >= 0; daysAgo--) {
    const date = addDays(now, -daysAgo);
    const iso = toLocalIso(date);
    const active = roster.filter((r) => r.activity.has(iso));
    for (const r of active) lastActive.set(r.member.id, daysAgo);
    // Con un solo equipo se usan sus diferencias; con varios, la mayor del día.
    const daily = teams.map((t) => snapshot.daily[t.id]?.[iso]).filter((d) => d !== undefined);
    const widest = daily.reduce<(typeof daily)[number] | undefined>((a, b) => (!a || b.spread > a.spread ? b : a), undefined);
    days.push({
      iso,
      date,
      active: active.length,
      total: roster.length,
      percent: roster.length ? Math.round((active.length / roster.length) * 100) : 0,
      spread: widest?.spread ?? 0,
      flagged: false,
      difference: widest ? markedDifference(widest.generations) : null,
    });
  }

  // Los tres días con más diferencias entre integrantes.
  [...days]
    .sort((a, b) => b.spread - a.spread)
    .slice(0, 3)
    .forEach((day) => (day.flagged = day.spread > 0));

  const alerts = roster
    .map(({ team, member }) => ({ team, member, daysInactive: lastActive.get(member.id) ?? null }))
    .filter((a) => a.daysInactive === null || a.daysInactive >= INACTIVE_ALERT_DAYS)
    .sort((a, b) => (b.daysInactive ?? Infinity) - (a.daysInactive ?? Infinity));

  return { days, alerts, members: roster.length, activeToday: days[days.length - 1]?.active ?? 0 };
}

/** Temas que más tensión generaron esta semana en un equipo (máximo 3, valor relativo 0–1). */
export function getTensionThisWeek(snapshot: AdminSnapshot, team: Team) {
  return snapshot.tension[team.id] ?? [];
}
