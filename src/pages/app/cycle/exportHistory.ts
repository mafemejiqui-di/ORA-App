// Exportar historial en PDF (se genera en el navegador, igual que el informe de la administradora):
// - "Mi historial": los registros propios de la persona (Tótem, rituales y módulos de cada ciclo).
// - "Historial del equipo" (solo Líder): datos agregados del equipo, nunca respuestas individuales.
import type { CycleSummary, TeamDashboard } from "../../../data/api";
import { getGeneration } from "../../../data/catalogs";
import type { TeamMember } from "../../../data/teamData";
import type { Team, User } from "../../../data/types";
import { getRitualStats } from "../../../utils/ritual";

const MONTH = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MS_PER_DAY = 86_400_000;

// Colores de la app (RGB).
type Rgb = [number, number, number];
const PRIMARY: Rgb = [21, 132, 151];
const WINE: Rgb = [116, 23, 26];
const BROWN: Rgb = [113, 43, 19];
const STRONG: Rgb = [26, 26, 19];
const MUTED: Rgb = [136, 135, 128];
const BORDER: Rgb = [211, 209, 199];

const dayLabel = (date: Date) => `${date.getDate()} ${MONTH[date.getMonth()]} ${date.getFullYear()}`;
const isoDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return dayLabel(new Date(y, m - 1, d));
};
const cycleDates = (c: { startsAt: string; endsAt: string }) =>
  `${dayLabel(new Date(c.startsAt))} – ${dayLabel(new Date(Date.parse(c.endsAt) - MS_PER_DAY))}`;
const fileDate = (now: Date) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const sameInstant = (a: string, b: string) => Date.parse(a) === Date.parse(b);

/** Hoja A4 con utilidades de texto que saltan de página solas. */
async function createDoc(footer: string) {
  // Se carga solo al exportar, para no hacer más pesada la app.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const page = { width: 210, height: 297, margin: 18 };
  let y = page.margin;

  const ensure = (needed: number) => {
    if (y + needed > page.height - page.margin) {
      doc.addPage();
      y = page.margin;
    }
  };
  const text = (value: string, opts: { size?: number; bold?: boolean; color?: Rgb; indent?: number } = {}) => {
    const size = opts.size ?? 10;
    const x = page.margin + (opts.indent ?? 0);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? STRONG));
    const lines = doc.splitTextToSize(value, page.width - page.margin - x) as string[];
    const lineHeight = size * 0.45;
    ensure(lines.length * lineHeight);
    doc.text(lines, x, y);
    y += lines.length * lineHeight;
  };
  const gap = (mm: number) => (y += mm);
  const rule = () => {
    ensure(6);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(page.margin, y, page.width - page.margin, y);
    y += 5;
  };
  const heading = (value: string) => {
    ensure(16);
    gap(3);
    rule();
    text(value, { size: 13, bold: true, color: BROWN });
    gap(2);
  };
  /** "Etiqueta: valor" en una línea (la etiqueta en color). */
  const field = (label: string, value: string, indent = 3) => {
    text(`${label}: ${value || "—"}`, { size: 9.5, indent });
    gap(1);
  };
  const save = (name: string) => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`${footer} · Página ${i} de ${pages}`, page.width / 2, page.height - 8, { align: "center" });
    }
    doc.save(name);
  };

  return { text, gap, rule, heading, field, save };
}

function summaryLine(c: CycleSummary) {
  const parts = [
    c.energy !== null ? `Energía ${c.energy.toFixed(1)}/5` : "Energía: pocas respuestas",
    c.friction === "baja" ? "Fricción baja" : c.friction ? `Fricción ${getGeneration(c.friction)?.compact}` : "Fricción: pocas respuestas",
    `${c.decisions} ${c.decisions === 1 ? "decisión" : "decisiones"}`,
    c.climate !== null ? `Clima de cierre ${c.climate.toFixed(1)}/5` : "Cierre: pocas respuestas",
  ];
  return parts.join(" · ");
}

/** PDF con los registros propios: "mi-historial-ora-AAAA-MM-DD.pdf". */
export async function exportMyHistory(user: User, team: Team | null, history: CycleSummary[], now = new Date()) {
  const pdf = await createDoc("ORA · Mi historial · Privado");
  const generation = getGeneration(user.generation);

  pdf.text("Mi historial en ORA", { size: 20, bold: true, color: BROWN });
  pdf.gap(2);
  pdf.text([user.name, user.role, generation?.label, team?.name].filter(Boolean).join(" · "), { size: 10, color: MUTED });
  pdf.text(`Generado el ${dayLabel(now)} · Documento privado: solo contiene tus propios registros.`, { size: 9, color: MUTED });

  // Tótem.
  pdf.heading("Mi Tótem");
  if (user.totem) {
    pdf.field("Persona", user.totem.persona);
    pdf.field("Al equipo le sobra", user.totem.equipoSobra);
    pdf.field("Al equipo le falta", user.totem.equipoFalta);
    pdf.field("Acción", user.totem.accion);
  } else {
    pdf.text("Aún no has escrito tu Tótem.", { size: 9.5, color: MUTED, indent: 3 });
  }

  // Ritual diario.
  const stats = getRitualStats(user, now);
  const rituals = Object.entries(user.rituals ?? {}).sort(([a], [b]) => b.localeCompare(a));
  pdf.heading("Ritual diario");
  pdf.text(`Racha actual: ${stats.streak} · Récord: ${stats.record} · ${stats.doneInWindow} de ${stats.total} días en las últimas 4 semanas`, {
    size: 9.5,
    indent: 3,
  });
  pdf.gap(2);
  if (rituals.length === 0) pdf.text("Aún no tienes rituales registrados.", { size: 9.5, color: MUTED, indent: 3 });
  for (const [day, r] of rituals) {
    pdf.text(isoDay(day), { size: 9.5, bold: true, color: PRIMARY, indent: 3 });
    pdf.field("Cómo llegué", r.estado ?? "", 6);
    if (r.reflexiones.length) pdf.field("Reflexión", r.reflexiones.join(", "), 6);
    pdf.field("Intención", r.intencion ?? "", 6);
    pdf.gap(1);
  }

  // Módulos por ciclo (del más reciente al más antiguo).
  const decisions = user.decisions ?? [];
  const inCycle = (savedAt: string, c: CycleSummary) => {
    const t = Date.parse(savedAt);
    return t >= Date.parse(c.startsAt) && t < Date.parse(c.endsAt);
  };
  pdf.heading("Mis ciclos");
  if (history.length === 0) pdf.text("Aún no tienes ciclos registrados.", { size: 9.5, color: MUTED, indent: 3 });
  for (const c of history) {
    const diagnosis = Object.entries(user.diagnoses ?? {}).find(([key]) => sameInstant(key, c.startsAt))?.[1];
    const closing = Object.entries(user.closings ?? {}).find(([key]) => sameInstant(key, c.startsAt))?.[1];
    const cycleDecisions = decisions.filter((d) => inCycle(d.savedAt, c));

    pdf.gap(2);
    pdf.text(`Ciclo ${c.number}${c.current ? " (en curso)" : ""}`, { size: 11, bold: true, color: WINE });
    pdf.text(cycleDates(c), { size: 9, color: MUTED });
    pdf.gap(1.5);

    pdf.text("Ver cómo estamos", { size: 9.5, bold: true, indent: 3 });
    if (diagnosis) {
      pdf.field("Cómo llegué", diagnosis.estado ?? "", 6);
      pdf.field("Qué sentí en el equipo", diagnosis.sentir ?? "", 6);
      pdf.field("Actitud que noté", diagnosis.actitud ?? "", 6);
    } else pdf.text("Sin responder.", { size: 9.5, color: MUTED, indent: 6 });

    pdf.text("Decisiones", { size: 9.5, bold: true, indent: 3 });
    if (cycleDecisions.length === 0) pdf.text("Ninguna registrada.", { size: 9.5, color: MUTED, indent: 6 });
    for (const d of cycleDecisions) {
      pdf.text(
        `${dayLabel(new Date(d.savedAt))}: ${d.tipo ?? "—"} · Frenos: ${d.frenos.join(", ") || "—"} · Urgencia: ${d.urgencia ?? "—"}`,
        { size: 9.5, indent: 6 },
      );
      pdf.gap(1);
    }

    pdf.text("Cierre del ciclo", { size: 9.5, bold: true, indent: 3 });
    if (closing) {
      pdf.field("Comparado con el inicio", closing.comparacion ?? "", 6);
      pdf.field("Qué funcionó mejor", closing.funciono ?? "", 6);
      pdf.field("Me llevo", closing.intenciones.join(", "), 6);
    } else pdf.text(c.current ? "Pendiente (se abre en la semana 3)." : "Sin responder.", { size: 9.5, color: MUTED, indent: 6 });
  }

  pdf.save(`mi-historial-ora-${fileDate(now)}.pdf`);
}

/** PDF del equipo con datos agregados: "historial-equipo-ora-AAAA-MM-DD.pdf". */
export async function exportTeamHistory(team: Team, dashboard: TeamDashboard, members: TeamMember[], now = new Date()) {
  const pdf = await createDoc(`ORA · Historial de ${team.name}`);
  const { cycle, progress, friction, tension, minGroup } = dashboard;
  const pct = (n: number) => (dashboard.members > 0 ? Math.round((n / dashboard.members) * 100) : 0);

  pdf.text(`Historial del equipo`, { size: 20, bold: true, color: BROWN });
  pdf.gap(2);
  pdf.text(`${team.name} · Código ${team.code} · ${members.length} ${members.length === 1 ? "integrante" : "integrantes"}`, {
    size: 10,
    color: MUTED,
  });
  pdf.text(
    `Generado el ${dayLabel(now)} · Datos agregados y anónimos: los grupos con menos de ${minGroup} personas no se muestran.`,
    { size: 9, color: MUTED },
  );

  // Integrantes.
  pdf.heading("Integrantes");
  if (members.length === 0) pdf.text("Aún no tiene integrantes.", { size: 9.5, color: MUTED, indent: 3 });
  for (const m of members) {
    const detail = [m.role, getGeneration(m.generation)?.compact, m.hasTotem ? "Tótem activo" : null].filter(Boolean).join(" · ");
    pdf.text(`${m.name}${detail ? ` — ${detail}` : ""}`, { size: 9.5, indent: 3 });
    pdf.gap(1);
  }

  // Ciclo en curso.
  pdf.heading(`Ciclo ${cycle.number} en curso · Semana ${cycle.week} de 3`);
  pdf.text(cycleDates(cycle), { size: 9, color: MUTED, indent: 3 });
  pdf.gap(2);
  pdf.text("Participación", { size: 9.5, bold: true, indent: 3 });
  pdf.field("Ver cómo estamos", `${progress.diagnosis} de ${dashboard.members} (${pct(progress.diagnosis)}%)`, 6);
  pdf.field("Tomar una decisión", `${progress.decision} de ${dashboard.members} (${pct(progress.decision)}%)`, 6);
  pdf.field("Cerrar el ciclo", cycle.week >= 3 ? `${progress.closing} de ${dashboard.members} (${pct(progress.closing)}%)` : "Se abre en la semana 3", 6);
  pdf.gap(1);

  pdf.text("Fricción más frecuente (por generación)", { size: 9.5, bold: true, indent: 3 });
  if (friction.length === 0) pdf.text("Aún no hay respuestas suficientes.", { size: 9.5, color: MUTED, indent: 6 });
  for (const f of friction) {
    pdf.field(getGeneration(f.generation)?.label ?? f.generation, `${Math.round(f.value * 100)}% de fricción promedio · ${f.share}% del total`, 6);
  }
  pdf.gap(1);
  pdf.text("Tensión más registrada", { size: 9.5, bold: true, indent: 3 });
  if (tension.length === 0) pdf.text("Aún no hay respuestas suficientes.", { size: 9.5, color: MUTED, indent: 6 });
  tension.forEach((t, i) => pdf.text(`${i + 1}. ${t.label}`, { size: 9.5, indent: 6 }));

  // Historial de ciclos.
  pdf.heading("Historial de ciclos");
  for (const c of dashboard.history) {
    pdf.text(`Ciclo ${c.number}${c.current ? " (en curso)" : ""}`, { size: 11, bold: true, color: WINE });
    pdf.text(`${cycleDates(c)} · ${c.diagnoses} ${c.diagnoses === 1 ? "respuesta" : "respuestas"} de "Ver cómo estamos"`, {
      size: 9,
      color: MUTED,
    });
    pdf.text(summaryLine(c), { size: 9.5, indent: 3 });
    pdf.gap(3);
  }

  pdf.save(`historial-equipo-ora-${fileDate(now)}.pdf`);
}
