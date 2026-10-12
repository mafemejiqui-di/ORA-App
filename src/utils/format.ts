const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function parseIso(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month: month - 1, day };
}

export function formatDay(iso: string) {
  const { month, day } = parseIso(iso);
  return `${day} ${MONTHS[month]}`;
}

/** "15 Abr – 12 May". */
export function formatRange(start: string, end: string) {
  return `${formatDay(start)} – ${formatDay(end)}`;
}

/** "Maria Mejia" → "MM"; "Ana" → "A". */
export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
