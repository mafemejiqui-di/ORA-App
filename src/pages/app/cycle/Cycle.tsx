import { useState, type ReactNode } from "react";
import download from "../../../assets/icons/download.svg";
import flame from "../../../assets/icons/flame.svg";
import { useToast } from "../../../components/Toast";
import { WeekRing } from "../../../components/WeekRing";
import { getTeamMembers, type CycleSummary, type TeamDashboard } from "../../../data/api";
import { useAuth } from "../../../state/AuthContext";
import { useTeamDashboard } from "../../../state/useTeamDashboard";
import { CYCLE_DAYS, CYCLE_WEEKS, days, getCycleStatus, isLeader } from "../../../utils/cycle";
import { formatRange } from "../../../utils/format";
import { getRitualStats, toLocalIso } from "../../../utils/ritual";
import { AdminCycle } from "../../admin/AdminCycle";
import "./Cycle.css";

// Mismos colores que la leyenda: Ver cómo estamos (vino), Tomar una decisión (azul), Cerrar (gris).
const WEEK_COLORS = ["var(--color-rose-dark)", "var(--color-primary)", "var(--color-border)"];

const MS_PER_DAY = 86_400_000;

/** Fechas del ciclo para mostrar: el fin guardado es exclusivo (el ciclo termina el día anterior). */
function cycleRange(startsAt: string, endsAt: string) {
  return formatRange(toLocalIso(new Date(startsAt)), toLocalIso(new Date(Date.parse(endsAt) - MS_PER_DAY)));
}

const percent = (part: number, total: number) => (total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0);

/** En el historial solo se muestra el conteo de decisiones del ciclo. */
function summaryText(cycle: CycleSummary) {
  return `${cycle.decisions} ${cycle.decisions === 1 ? "decisión" : "decisiones"}`;
}

export function Cycle() {
  const { showToast } = useToast();
  const { user, team } = useAuth();
  const dashboard = useTeamDashboard();
  const [exporting, setExporting] = useState<"mine" | "team" | null>(null);

  // La administradora ve en qué ciclo y semana va cada equipo.
  if (user?.isAdmin) return <AdminCycle />;

  /** Genera y descarga el PDF (el módulo de PDF se carga solo al exportar). */
  async function runExport(kind: "mine" | "team") {
    if (!user || !team) return;
    if (!dashboard.data) {
      showToast("Espera a que carguen los datos del ciclo e inténtalo de nuevo.");
      return;
    }
    setExporting(kind);
    try {
      const { exportMyHistory, exportTeamHistory } = await import("./exportHistory");
      if (kind === "mine") await exportMyHistory(user, team, dashboard.data.history);
      else await exportTeamHistory(team, dashboard.data, await getTeamMembers(team.id));
      showToast("PDF descargado", "primary");
    } catch {
      showToast("No pudimos generar el PDF. Inténtalo de nuevo.");
    } finally {
      setExporting(null);
    }
  }

  // El Ritual diario sale de los rituales que la persona ha completado.
  const stats = user ? getRitualStats(user) : null;
  const ritual = { done: stats?.doneInWindow ?? 0, total: stats?.total ?? 28 };
  const ritualPercent = Math.round((ritual.done / ritual.total) * 100);
  const cycle = getCycleStatus(team);

  return (
    <main className="cycle">
      <header className="cycle__header">
        <h1 className="cycle__title">Ciclo</h1>
        {cycle && <span className="cycle__badge">Ciclo {cycle.number} activo</span>}
      </header>

      {!cycle ? (
        <section className="cycle__block">
          <p className="cycle__empty">Únete a un equipo desde la pestaña Equipo para empezar tu primer ciclo.</p>
        </section>
      ) : (
        <>
          <section className="cycle__block" aria-labelledby="cycle-active-label">
            <h2 className="section-label" id="cycle-active-label">
              Ciclo activo
            </h2>

            <div className="cycle-progress">
              <div className="cycle-progress__row">
                <span className="cycle-progress__title">Ciclo {cycle.number}</span>
                <span className="cycle-progress__week">
                  Semana {cycle.week} de {CYCLE_WEEKS}
                </span>
              </div>
              <div
                className="cycle-progress__bar"
                role="progressbar"
                aria-label="Avance del ciclo en días"
                aria-valuemin={0}
                aria-valuemax={CYCLE_DAYS}
                aria-valuenow={cycle.day}
              >
                <div className="cycle-progress__elapsed" style={{ width: `${(cycle.day / CYCLE_DAYS) * 100}%` }} />
              </div>
              <p className="cycle-progress__left">
                {days(cycle.daysLeft)} para el ciclo {cycle.number + 1}
              </p>
            </div>

            <ParticipationCard dashboard={dashboard.data} day={cycle.day} week={cycle.week} loading={dashboard.loading && !dashboard.data}>
              <div className="ring-ritual">
                <div className="ring-ritual__label">
                  <img src={flame} width={14} height={14} alt="" />
                  <span className="ring-ritual__title">Ritual diario</span>
                  <span className="ring-ritual__days">
                    {ritual.done} de {ritual.total} días
                  </span>
                </div>
                <div className="ring-ritual__meter">
                  <div
                    className="ring-ritual__bar"
                    role="progressbar"
                    aria-label="Ritual diario"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={ritualPercent}
                  >
                    <div className="ring-ritual__fill" style={{ width: `${ritualPercent}%` }} />
                  </div>
                  <span className="ring-ritual__percent">{ritualPercent}%</span>
                </div>
              </div>
            </ParticipationCard>
          </section>

          <section className="cycle__block cycle__block--history" aria-labelledby="cycle-history-label">
            <h2 className="section-label" id="cycle-history-label">
              Historial
            </h2>

            <ol className="cycle-history">
              {(dashboard.data?.history ?? []).map((item) => (
                <li key={item.number} className={item.current ? "cycle-card cycle-card--active" : "cycle-card cycle-card--done"}>
                  <div className="cycle-card__head">
                    <span className="cycle-card__title">Ciclo {item.number}</span>
                    <span className="cycle-card__side">
                      <span className={item.current ? "cycle-card__state" : "cycle-card__state cycle-card__state--done"}>
                        {item.current ? "En curso" : "Terminado"}
                      </span>
                      <span className="cycle-card__dates">{cycleRange(item.startsAt, item.endsAt)}</span>
                    </span>
                  </div>
                  <p className="cycle-card__stats">{summaryText(item)}</p>
                </li>
              ))}
              {/* Los dos ciclos que siguen (cada uno empieza 21 días después del anterior). */}
              {[1, 2].map((ahead) => (
                <li key={ahead} className="cycle-card cycle-card--upcoming">
                  Ciclo {cycle.number + ahead} · Comienza en {days(cycle.daysLeft + (ahead - 1) * CYCLE_DAYS)}
                </li>
              ))}
            </ol>

            <div className="cycle-export">
              <button
                type="button"
                className="cycle-export__button"
                disabled={exporting !== null}
                onClick={() => void runExport("mine")}
              >
                <img src={download} width={16} height={16} alt="" />
                {exporting === "mine" ? "Generando PDF…" : "Exportar mi historial"}
              </button>
              {/* Solo quien tiene el rol de Líder puede exportar el historial de todo el equipo. */}
              {isLeader(user?.role) && (
                <button
                  type="button"
                  className="cycle-export__button"
                  disabled={exporting !== null}
                  onClick={() => void runExport("team")}
                >
                  <img src={download} width={16} height={16} alt="" />
                  {exporting === "team" ? "Generando PDF…" : "Exportar historial del equipo"}
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

/** Anillo de 21 días (uno por día, del color del módulo de su semana) y participación del equipo. */
function ParticipationCard({
  dashboard,
  day,
  week,
  loading,
  children,
}: {
  dashboard: TeamDashboard | null;
  day: number;
  week: number;
  loading: boolean;
  children: ReactNode;
}) {
  const members = dashboard?.members ?? 0;
  const progress = dashboard?.progress ?? { diagnosis: 0, decision: 0, closing: 0 };
  const steps = {
    diagnosis: percent(progress.diagnosis, members),
    decision: percent(progress.decision, members),
    closing: percent(progress.closing, members),
  };
  // Participación general: promedio de los módulos cuya semana ya llegó.
  const reached = [steps.diagnosis, ...(week >= 2 ? [steps.decision] : []), ...(week >= 3 ? [steps.closing] : [])];
  const overall = Math.round(reached.reduce((a, b) => a + b, 0) / reached.length);
  const of = (n: number) => `${n} de ${members}`;

  return (
    <div className="card ring-card">
      <WeekRing
        compact
        label={`Día ${day} de ${CYCLE_DAYS}. Participación del equipo: ${overall}%.`}
        centerValue={loading ? "…" : `${overall}%`}
        weeks={Array.from({ length: CYCLE_DAYS }, (_, i) => ({
          color: WEEK_COLORS[Math.floor(i / 7)],
          filled: i < day,
        }))}
      />
      <p className="ring-card__caption">Participación del equipo en este ciclo</p>

      <ul className="ring-legend">
        <li className="ring-legend__item">
          <span className="ring-legend__label">
            <span className="ring-legend__dot ring-legend__dot--rose" /> Ver cómo estamos
          </span>
          <span className="ring-legend__value ring-legend__value--rose" title={of(progress.diagnosis)}>
            {steps.diagnosis}%
          </span>
        </li>
        <li className={week >= 2 ? "ring-legend__item" : "ring-legend__item ring-legend__item--pending"}>
          <span className="ring-legend__label">
            <span className="ring-legend__dot ring-legend__dot--teal" /> Tomar una decisión
          </span>
          <span className="ring-legend__value ring-legend__value--teal" title={of(progress.decision)}>
            {steps.decision}%
          </span>
        </li>
        <li className={week >= 3 ? "ring-legend__item" : "ring-legend__item ring-legend__item--pending"}>
          <span className="ring-legend__label">
            <span className="ring-legend__dot ring-legend__dot--gray" /> Cerrar el ciclo
          </span>
          <span className={week >= 3 ? "ring-legend__value" : "ring-legend__value ring-legend__value--pending"}>
            {week >= 3 ? `${steps.closing}%` : "Semana 3"}
          </span>
        </li>
      </ul>

      {children}
    </div>
  );
}
