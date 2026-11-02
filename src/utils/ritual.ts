import { RITUAL_WINDOW_DAYS } from "../data/ritual";
import type { RitualEntry, User } from "../data/types";
import { isHoliday, isWorkday, previousWorkday } from "./workdays";

/**
 * Estado de cada punto de la semana. "today" = hoy pendiente; "today-done" = hoy ya completado;
 * "holiday" = festivo entre semana (no cuenta).
 */
export type WeekDot = "completed" | "today" | "today-done" | "empty" | "holiday";

export type RitualStats = {
  /** Días laborales seguidos con ritual (fines de semana y festivos ni suman ni cortan). */
  streak: number;
  record: number;
  /** Días laborales con ritual en los últimos 21 días (incluido hoy). */
  doneInWindow: number;
  /** Días laborales en esos 21 días (normalmente 15; menos si hubo festivos). */
  total: number;
  /** Si hizo el ritual hoy, aunque hoy no sea día laboral. */
  completedToday: boolean;
  todayEntry: RitualEntry | null;
  /** Lunes a viernes de la semana actual. */
  weekDots: WeekDot[];
};

/** Fecha local como YYYY-MM-DD (no UTC: el día cambia a medianoche local). */
export function toLocalIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseIso(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Racha más larga de días laborales seguidos dentro de un conjunto de fechas (ya solo laborales). */
function longestRun(workdays: Set<string>) {
  const sorted = [...workdays].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const iso of sorted) {
    run = previous && toLocalIso(previousWorkday(parseIso(iso))) === previous ? run + 1 : 1;
    best = Math.max(best, run);
    previous = iso;
  }
  return best;
}

export function getRitualStats(user: User, now = new Date()): RitualStats {
  const todayIso = toLocalIso(now);
  const allDays = Object.keys(user.rituals ?? {});
  const completedToday = allDays.includes(todayIso);
  // Solo cuentan los rituales hechos en día laboral.
  const days = new Set(allDays.filter((iso) => isWorkday(parseIso(iso))));

  // La racha sigue viva si hiciste el ritual hoy o el día laboral anterior
  // (p. ej. el lunes todavía vale la del viernes).
  let streak = 0;
  let cursor = days.has(todayIso) ? now : previousWorkday(now);
  while (days.has(toLocalIso(cursor))) {
    streak++;
    cursor = previousWorkday(cursor);
  }

  let doneInWindow = 0;
  let total = 0;
  for (let i = 0; i < RITUAL_WINDOW_DAYS; i++) {
    const day = addDays(now, -i);
    if (!isWorkday(day)) continue;
    total++;
    if (days.has(toLocalIso(day))) doneInWindow++;
  }

  const monday = addDays(now, -((now.getDay() + 6) % 7));
  const weekDots = Array.from({ length: 5 }, (_, i): WeekDot => {
    const day = addDays(monday, i);
    const iso = toLocalIso(day);
    if (isHoliday(day)) return "holiday";
    if (iso === todayIso) return completedToday ? "today-done" : "today";
    return days.has(iso) ? "completed" : "empty";
  });

  return {
    streak,
    record: Math.max(longestRun(days), streak),
    doneInWindow,
    total,
    completedToday,
    todayEntry: user.rituals?.[todayIso] ?? null,
    weekDots,
  };
}
