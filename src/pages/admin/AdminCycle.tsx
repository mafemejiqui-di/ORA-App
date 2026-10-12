import { getAdminSnapshot } from "../../data/api";
import { getCycleStatus, MODULE_WEEK } from "../../utils/cycle";
import { getTensionThisWeek } from "../../utils/teamInsights";
import { useLiveAsync } from "../../utils/useLiveAsync";
import { AdminStatus } from "./AdminStatus";
import "../../components/TeamPatterns.css";
import "./Admin.css";

const PHASES = [
  { week: MODULE_WEEK.diagnosis, label: "Ver cómo estamos" },
  { week: MODULE_WEEK.decision, label: "Decidir" },
  { week: MODULE_WEEK.closing, label: "Cerrar" },
];

/** Ciclo de la administradora: en qué ciclo y semana va cada equipo y qué generó tensión esta semana. */
export function AdminCycle() {
  const state = useLiveAsync(getAdminSnapshot, [], null);
  if (!state.data) return <AdminStatus title="Ciclo" state={state} />;
  const snapshot = state.data;
  const { teams } = snapshot;

  return (
    <main className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Ciclo</h1>
        <p className="admin__sub">Avance de cada equipo</p>
      </header>

      <section className="admin__section" aria-label="Avance por equipo">
        <ul className="admin-teams">
          {teams.map((team) => {
            const status = getCycleStatus(team);
            const tension = getTensionThisWeek(snapshot, team);
            const latest = snapshot.insights[team.id]?.[0];
            return (
              <li key={team.id} className="admin__card">
                <div className="admin-team__head">
                  <h2 className="admin-team__name">{team.name}</h2>
                  <span className="admin-team__meta">
                    {status ? `Ciclo ${status.number} · Semana ${status.week} de 3` : "Sin ciclo en curso"}
                  </span>
                </div>

                <div className="admin-week" aria-label="Semanas del ciclo">
                  {PHASES.map((phase) => (
                    <span
                      key={phase.week}
                      className={status?.week === phase.week ? "admin-week__step is-current" : "admin-week__step"}
                      aria-current={status?.week === phase.week ? "step" : undefined}
                    >
                      <strong>Sem. {phase.week}</strong>
                      {phase.label}
                    </span>
                  ))}
                </div>

                <div className="admin-tension">
                  <h3 className="pattern__title pattern__title--teal">Temas que generaron tensión esta semana</h3>
                  {tension.length === 0 ? (
                    <p className="admin__caption">Sin registros de tensión esta semana.</p>
                  ) : (
                    <ul className="pattern__rows">
                      {tension.map((row) => (
                        <li key={row.label} className="pattern__row pattern__row--wide">
                          <span className="pattern__label pattern__label--teal">{row.label}</span>
                          <span className="pattern__track pattern__track--gray">
                            <span className="pattern__fill pattern__fill--teal" style={{ width: `${row.value * 100}%` }} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Última lectura semanal de la IA del equipo. */}
                <div className="admin-tension">
                  <h3 className="pattern__title pattern__title--teal">
                    Lectura de la semana{latest ? ` · Ciclo ${latest.cycleNumber}, semana ${latest.week}` : ""}
                  </h3>
                  <p className="admin__caption">
                    {!latest
                      ? "Aún no hay lecturas: se escriben al terminar cada semana."
                      : latest.status === "ok"
                        ? `${latest.resumen} Sugerencia: ${latest.sugerencia}`
                        : latest.status === "insufficient"
                          ? "Respondieron menos de 3 personas: no hubo lectura."
                          : "No se pudo generar; se reintentará."}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
