import { hasPatterns, TeamPatterns } from "../../components/TeamPatterns";
import { getAdminSnapshot } from "../../data/api";
import { getTeamCycleNumber } from "../../utils/cycle";
import { useLiveAsync } from "../../utils/useLiveAsync";
import { AdminStatus } from "./AdminStatus";
import { TeamAccordion } from "./TeamAccordion";
import "./Admin.css";

/** Equipo de la administradora: cada equipo se despliega con sus patrones (fricción y tensión). */
export function AdminTeams() {
  const state = useLiveAsync(getAdminSnapshot, [], null);
  if (!state.data) return <AdminStatus title="Equipos" state={state} />;
  const { teams, members: membersByTeam, dashboards } = state.data;

  return (
    <main className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Equipos</h1>
        <p className="admin__sub">Toca un equipo para ver sus patrones</p>
      </header>

      <section className="admin__section" aria-label="Equipos que usan la app">
        {teams.length === 0 && <p className="admin__empty">Aún no hay equipos registrados.</p>}
        <ul className="admin-teams">
          {teams.map((team) => {
            const members = (membersByTeam[team.id] ?? []).length;
            const cycle = getTeamCycleNumber(team);
            return (
              <TeamAccordion
                key={team.id}
                title={team.name}
                summary={`${members} ${members === 1 ? "integrante" : "integrantes"} · ${cycle ? `Ciclo ${cycle}` : "Sin ciclo iniciado"}`}
              >
                {hasPatterns(dashboards[team.id]) ? (
                  <TeamPatterns dashboard={dashboards[team.id]} />
                ) : (
                  <p className="admin__empty">Aún no hay suficientes registros para mostrar sus patrones.</p>
                )}
              </TeamAccordion>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
