// Informe de la app en PDF para la administradora: resumen, uso diario por equipo,
// diferencias más marcadas, temas de tensión y alertas. Se genera en el navegador.
import { getGeneration } from "../../data/catalogs";
import { getAdminTensionShares, type AdminSnapshot, type AdminTensionReport, type TensionShares } from "../../data/api";
import { getCycleStatus } from "../../utils/cycle";
import { getUsageReport, INACTIVE_ALERT_DAYS, type UsageDay, type UsageReport } from "../../utils/teamInsights";

const WINDOW_DAYS = 14;

/**
 * Apropiación de la app: de todos los días posibles (integrantes × días del periodo), en cuántos
 * se usó de verdad. También cuántos integrantes la usaron al menos una vez.
 */
function appropriation(report: UsageReport) {
  const used = report.days.reduce((sum, d) => sum + d.active, 0);
  const possible = report.days.reduce((sum, d) => sum + d.total, 0);
  const neverUsed = report.alerts.filter((a) => a.daysInactive === null).length;
  return {
    percent: possible ? Math.round((used / possible) * 100) : 0,
    used,
    possible,
    membersUsed: report.members - neverUsed,
    members: report.members,
  };
}

/** "1. Falta de consenso — 32% (8 menciones)". */
const shareLine = (t: TensionShares["themes"][number], i: number) =>
  `${i + 1}. ${t.label} — ${t.share.toLocaleString("es-CO", { maximumFractionDigits: 1 })}% (${t.count} ${t.count === 1 ? "mención" : "menciones"})`;

const MONTH = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const WEEKDAY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEKDAY_INITIAL = ["D", "L", "M", "X", "J", "V", "S"];

// Colores de la app (RGB).
const PRIMARY: [number, number, number] = [21, 132, 151];
const WINE: [number, number, number] = [116, 23, 26];
const BROWN: [number, number, number] = [113, 43, 19];
const STRONG: [number, number, number] = [26, 26, 19];
const MUTED: [number, number, number] = [136, 135, 128];
const BORDER: [number, number, number] = [211, 209, 199];
const AMBER: [number, number, number] = [133, 79, 11];

const dayLabel = (date: Date) => `${WEEKDAY[date.getDay()]} ${date.getDate()} ${MONTH[date.getMonth()]}`;
const differenceText = (day: UsageDay) =>
  day.difference
    ? `${day.difference.low.who} (${day.difference.low.estado}) vs. ${day.difference.high.who} (${day.difference.high.estado})`
    : "Sin diferencias marcadas";

/** Genera el informe y lo descarga como "informe-ora-AAAA-MM-DD.pdf". */
export async function exportAppReport(snapshot: AdminSnapshot, now = new Date()) {
  // Se carga solo al exportar, para no hacer más pesada la app.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const page = { width: 210, height: 297, margin: 18 };
  const contentWidth = page.width - page.margin * 2;
  let y = page.margin;

  const ensure = (needed: number) => {
    if (y + needed > page.height - page.margin) {
      doc.addPage();
      y = page.margin;
    }
  };
  const text = (value: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; x?: number } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10);
    doc.setTextColor(...(opts.color ?? STRONG));
    const x = opts.x ?? page.margin;
    const lines = doc.splitTextToSize(value, page.width - page.margin - x) as string[];
    const lineHeight = (opts.size ?? 10) * 0.45;
    ensure(lines.length * lineHeight);
    doc.text(lines, x, y);
    y += lines.length * lineHeight;
  };
  const gap = (mm: number) => (y += mm);
  const rule = () => {
    ensure(4);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(page.margin, y, page.width - page.margin, y);
    y += 5;
  };

  const { teams } = snapshot;
  const overall = getUsageReport(snapshot, teams, WINDOW_DAYS, now);
  const overallUse = appropriation(overall);
  // Si la consulta de tensiones falla, el informe sale igual (sin porcentajes de tensión).
  const shares: AdminTensionReport = await getAdminTensionShares(WINDOW_DAYS).catch(() => ({
    days: WINDOW_DAYS,
    teams: {},
    overall: null,
  }));

  // ── Portada y resumen ─────────────────────────────────────────────
  text("Informe de uso de la app", { size: 20, bold: true, color: BROWN });
  gap(2);
  text(`ORA · Generado el ${dayLabel(now)} ${now.getFullYear()} · Últimos 14 días`, { size: 10, color: MUTED });
  gap(6);

  const stats = [
    [String(teams.length), "Equipos conectados"],
    [String(overall.members), "Integrantes"],
    [`${overallUse.percent}%`, "Apropiación de la app"],
    [String(overall.activeToday), "Usaron la app hoy"],
    [String(overall.alerts.length), `Alertas (${INACTIVE_ALERT_DAYS}+ días sin uso)`],
  ];
  const boxGap = 3;
  const boxWidth = (contentWidth - (stats.length - 1) * boxGap) / stats.length;
  ensure(22);
  stats.forEach(([value, label], i) => {
    const x = page.margin + i * (boxWidth + boxGap);
    doc.setFillColor(241, 239, 232);
    doc.roundedRect(x, y, boxWidth, 20, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...STRONG);
    doc.text(value, x + 4, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(label, boxWidth - 8) as string[], x + 4, y + 14);
  });
  y += 28;

  // ── Apropiación y tensiones de todos los equipos ──────────────────
  text("Apropiación de la app", { size: 12, bold: true, color: BROWN });
  gap(1);
  text(
    `${overallUse.percent}% de apropiación: la app se usó en ${overallUse.used} de ${overallUse.possible} días posibles ` +
      `(${overallUse.members} integrantes × ${WINDOW_DAYS} días). ${overallUse.membersUsed} de ${overallUse.members} integrantes ` +
      `(${overallUse.members ? Math.round((overallUse.membersUsed / overallUse.members) * 100) : 0}%) la usaron al menos una vez.`,
    { size: 9.5 },
  );
  gap(4);
  text("Tensiones más evidenciadas (todos los equipos)", { size: 12, bold: true, color: BROWN });
  gap(1);
  if (shares.overall) {
    text(`Porcentaje de las ${shares.overall.total} menciones de tensión registradas por ${shares.overall.people} personas en los últimos ${WINDOW_DAYS} días:`, {
      size: 9,
      color: MUTED,
    });
    gap(1);
    shares.overall.themes.forEach((t, i) => text(shareLine(t, i), { size: 9.5, x: page.margin + 3 }));
  } else {
    text("Aún no hay suficientes registros de tensión (se necesitan al menos 3 personas).", { size: 9.5, color: MUTED });
  }
  gap(6);

  // ── Un bloque por equipo ──────────────────────────────────────────
  for (const team of teams) {
    const report = getUsageReport(snapshot, [team], WINDOW_DAYS, now);
    const members = snapshot.members[team.id] ?? [];
    const status = getCycleStatus(team, now);
    const use = appropriation(report);
    const inactive = new Map(report.alerts.map((a) => [a.member.id, a.daysInactive]));

    ensure(60);
    rule();
    text(team.name, { size: 14, bold: true, color: BROWN });
    gap(1);
    text(
      `Código ${team.code} · ${members.length} integrantes · ${
        status ? `Ciclo ${status.number} · Semana ${status.week} de 3` : "Sin ciclo en curso"
      }`,
      { size: 9, color: MUTED },
    );
    gap(2);
    text(
      `Apropiación de la app: ${use.percent}% (${use.used} de ${use.possible} días posibles) · ` +
        `${use.membersUsed} de ${use.members} integrantes la usaron al menos una vez`,
      { size: 9.5, bold: true, color: PRIMARY },
    );
    gap(4);

    // Gráfica de barras: % del equipo que usó la app cada día.
    if (members.length) {
      // Título y gráfica siempre en la misma hoja.
      ensure(55);
      text("Uso diario (% del equipo que usó la app)", { size: 10, bold: true });
      gap(2);
      const chartHeight = 32;
      const labelSpace = 8;
      ensure(chartHeight + 14);
      const chartX = page.margin + labelSpace;
      const chartWidth = contentWidth - labelSpace;
      const slot = chartWidth / report.days.length;
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      for (const [pct, offset] of [
        [100, 0],
        [50, chartHeight / 2],
        [0, chartHeight],
      ] as const) {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.15);
        doc.line(chartX, y + offset, chartX + chartWidth, y + offset);
        doc.text(`${pct}%`, page.margin, y + offset + 1);
      }
      report.days.forEach((day, i) => {
        const barHeight = (day.percent / 100) * chartHeight;
        const x = chartX + i * slot + slot * 0.2;
        doc.setFillColor(...PRIMARY);
        doc.rect(x, y + chartHeight - barHeight, slot * 0.6, barHeight, "F");
        // Marca de los días con la diferencia más marcada.
        if (day.flagged) {
          doc.setFillColor(...WINE);
          const cx = x + slot * 0.3;
          doc.triangle(cx - 1.2, y + chartHeight + 6.2, cx + 1.2, y + chartHeight + 6.2, cx, y + chartHeight + 4.2, "F");
        }
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(WEEKDAY_INITIAL[day.date.getDay()], x + slot * 0.3, y + chartHeight + 3.5, { align: "center" });
      });
      y += chartHeight + 10;

      const flagged = report.days.filter((d) => d.flagged);
      if (flagged.length) {
        ensure(8 + flagged.length * 4.5);
        text("Días con la diferencia más marcada (triángulo vino)", { size: 10, bold: true });
        gap(1);
        flagged.forEach((day) => text(`${dayLabel(day.date)}: ${differenceText(day)}`, { size: 9, x: page.margin + 3 }));
        gap(3);
      }
    }

    // Tensiones más evidenciadas del equipo, con su porcentaje del total de menciones.
    const teamShares = shares.teams[team.id];
    ensure(12 + (teamShares?.themes.length ?? 1) * 4.5);
    text(`Tensiones más evidenciadas (últimos ${WINDOW_DAYS} días)`, { size: 10, bold: true });
    gap(1);
    if (teamShares) {
      text(`${teamShares.total} menciones registradas por ${teamShares.people} personas:`, { size: 9, color: MUTED, x: page.margin + 3 });
      teamShares.themes.forEach((t, i) => text(shareLine(t, i), { size: 9, x: page.margin + 3 }));
    } else {
      text("Menos de 3 personas registraron tensiones: no se muestran por privacidad.", { size: 9, color: MUTED, x: page.margin + 3 });
    }
    gap(3);

    // Integrantes y su último uso.
    ensure(8 + Math.max(members.length, 1) * 4.6);
    text("Integrantes", { size: 10, bold: true });
    gap(1);
    if (!members.length) text("Aún no tiene integrantes.", { size: 9, color: MUTED, x: page.margin + 3 });
    for (const member of members) {
      const role = [member.role, getGeneration(member.generation)?.compact].filter(Boolean).join(" · ") || "Sin rol ni generación";
      const status = inactive.has(member.id)
        ? inactive.get(member.id) === null
          ? "  — Sin uso en 14 días"
          : `  — ${inactive.get(member.id)} días sin usar la app`
        : "";
      ensure(5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...STRONG);
      doc.text(`${member.name}`, page.margin + 3, y);
      doc.setTextColor(...MUTED);
      doc.text(role, page.margin + 50, y);
      if (status) {
        doc.setTextColor(...AMBER);
        doc.text(status.trim(), page.width - page.margin, y, { align: "right" });
      }
      y += 4.6;
    }
    gap(4);
  }

  // ── Alertas ───────────────────────────────────────────────────────
  ensure(20);
  rule();
  text("Alertas: integrantes que no están usando la app", { size: 14, bold: true, color: BROWN });
  gap(1);
  text(`${INACTIVE_ALERT_DAYS} días o más sin usarla.`, { size: 9, color: MUTED });
  gap(3);
  if (!overall.alerts.length) text("Todos los integrantes usaron la app en los últimos días.", { size: 9 });
  for (const alert of overall.alerts) {
    text(
      `• ${alert.member.name} (${alert.team.name}) — ${
        alert.daysInactive === null ? "sin usar la app en 14 días" : `${alert.daysInactive} días sin usar la app`
      }`,
      { size: 9, color: AMBER, x: page.margin + 3 },
    );
  }

  // Número de página en cada hoja.
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`ORA · Informe de uso · Página ${i} de ${pages}`, page.width / 2, page.height - 8, { align: "center" });
  }

  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  doc.save(`informe-ora-${iso}.pdf`);
}
