// Días laborales en Colombia: lunes a viernes que no sean festivo (decisión del usuario: la racha
// del ritual y su conteo solo usan estos días; fines de semana y festivos ni suman ni cortan).
// Festivos según la Ley 51 de 1983 ("Ley Emiliani"). La misma regla está copiada en
// supabase/functions/recordatorio-diario/index.ts para no enviar la notificación esos días.

const holidayCache = new Map<number, Set<string>>();

function iso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function shift(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Lleva la fecha al lunes siguiente (si ya es lunes, se queda). */
function toMonday(date: Date) {
  return shift(date, (8 - date.getDay()) % 7);
}

const dateIso = (date: Date) => iso(date.getFullYear(), date.getMonth() + 1, date.getDate());

/** Festivos de Colombia del año, como YYYY-MM-DD. */
export function colombianHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);
  const days = [
    // Fijos: se celebran el mismo día aunque caigan entre semana.
    new Date(year, 0, 1), // Año Nuevo
    new Date(year, 4, 1), // Día del Trabajo
    new Date(year, 6, 20), // Independencia
    new Date(year, 7, 7), // Batalla de Boyacá
    new Date(year, 11, 8), // Inmaculada Concepción
    new Date(year, 11, 25), // Navidad
    // Semana Santa: no se trasladan.
    shift(easter, -3), // Jueves Santo
    shift(easter, -2), // Viernes Santo
    // Se trasladan al lunes siguiente.
    toMonday(new Date(year, 0, 6)), // Reyes Magos
    toMonday(new Date(year, 2, 19)), // San José
    toMonday(new Date(year, 5, 29)), // San Pedro y San Pablo
    toMonday(new Date(year, 7, 15)), // Asunción de la Virgen
    toMonday(new Date(year, 9, 12)), // Día de la Raza
    toMonday(new Date(year, 10, 1)), // Todos los Santos
    toMonday(new Date(year, 10, 11)), // Independencia de Cartagena
    toMonday(shift(easter, 39)), // Ascensión del Señor
    toMonday(shift(easter, 60)), // Corpus Christi
    toMonday(shift(easter, 68)), // Sagrado Corazón
  ];
  const set = new Set(days.map(dateIso));
  holidayCache.set(year, set);
  return set;
}

export function isHoliday(date: Date) {
  return colombianHolidays(date.getFullYear()).has(dateIso(date));
}

export function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Lunes a viernes que no sea festivo en Colombia. */
export function isWorkday(date: Date) {
  return !isWeekend(date) && !isHoliday(date);
}

/** Día laboral anterior a `date` (sin contar `date`). */
export function previousWorkday(date: Date) {
  let cursor = shift(date, -1);
  while (!isWorkday(cursor)) cursor = shift(cursor, -1);
  return cursor;
}
