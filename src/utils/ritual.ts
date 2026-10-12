import { RITUAL_WINDOW_DAYS } from "../data/ritual";
import type { RitualEntry, User } from "../data/types";

/** Estado de cada punto de la semana. "today" = hoy pendiente; "today-done" = hoy ya completado. */
export type WeekDot = "completed" | "today" | "today-done" | "empty";

export type RitualStats = {
  streak: number;
  record: number;
  /** Días con ritual en los últimos 28 días (incluido hoy). */
  doneInWindow: number;
  total: number;
  completedToday: boolean;
  todayEntry: RitualEntry | null;
  /** Lunes a domingo de la semana actual. */
  weekDots: WeekDot[];
};

const MS_PER_DAY = 86_400_000;

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

/** Racha más larga de días consecutivos dentro de un conjunto de fechas. */
function longestRun(days: Set<string>) {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const iso of sorted) {
    const current = parseIso(iso);
    run = previous && Math.round((current.getTime() - previous.getTime()) / MS_PER_DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = current;
  }
  return best;
}

export function getRitualStats(user: User, now = new Date()): RitualStats {
  const todayIso = toLocalIso(now);
  const days = new Set(Object.keys(user.rituals ?? {}));
  const completedToday = days.has(todayIso);

  // La racha sigue viva si hiciste el ritual hoy o ayer.
  let streak = 0;
  let cursor = completedToday ? now : addDays(now, -1);
  while (days.has(toLocalIso(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  let doneInWindow = 0;
  for (let i = 0; i < RITUAL_WINDOW_DAYS; i++) {
    if (days.has(toLocalIso(addDays(now, -i)))) doneInWindow++;
  }

  const monday = addDays(now, -((now.getDay() + 6) % 7));
  const weekDots = Array.from({ length: 7 }, (_, i): WeekDot => {
    const iso = toLocalIso(addDays(monday, i));
    if (iso === todayIso) return completedToday ? "today-done" : "today";
    return days.has(iso) ? "completed" : "empty";
  });

  return {
    streak,
    record: Math.max(longestRun(days), streak),
    doneInWindow,
    total: RITUAL_WINDOW_DAYS,
    completedToday,
    todayEntry: user.rituals?.[todayIso] ?? null,
    weekDots,
  };
}
