import { hasPatterns, TeamPatterns } from "../../components/TeamPatterns";
import { getAdminSnapshot } from "../../data/api";
import { getTeamCycleNumber } from "../../utils/cycle";
import { getUsageReport } from "../../utils/teamInsights";
import { useLiveAsync } from "../../utils/useLiveAsync";
import { AdminStatus } from "./AdminStatus";
import { TeamAccordion } from "./TeamAccordion";
import { TeamManage } from "./TeamManage";
import "./Admin.css";

/** Equipos de la administradora: cada equipo se despliega con sus integrantes (Tótem y acciones) y patrones. */
export function AdminTeams() {
  const state = useLiveAsync(getAdminSnapshot, [], null);
  if (!state.data) return <AdminStatus title="Equipos" state={state} />;
  const snapshot = state.data;
  const { teams, members: membersByTeam, dashboards } = snapshot;
  const inactiveById = new Map(getUsageReport(snapshot, teams).alerts.map((a) => [a.member.id, a.daysInactive]));

  return (
    <main className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Equipos</h1>
        <p className="admin__sub">Toca un equipo para ver sus integrantes y patrones</p>
      </header>

      <section className="admin__section" aria-label="Equipos que usan la app">
        {teams.length === 0 && <p className="admin__empty">Aún no hay equipos registrados.</p>}
        <ul className="admin-teams">
          {teams.map((team) => {
            const members = membersByTeam[team.id] ?? [];
            const cycle = getTeamCycleNumber(team);
            return (
              <TeamAccordion
                key={team.id}
                title={team.name}
                summary={`${members.length} ${members.length === 1 ? "integrante" : "integrantes"} · ${cycle ? `Ciclo ${cycle}` : "Sin ciclo iniciado"}`}
              >
                <TeamManage
                  team={team}
                  members={members}
                  inactiveById={inactiveById}
                  onChanged={state.reload}
                  patterns={
                    hasPatterns(dashboards[team.id]) ? (
                      <TeamPatterns dashboard={dashboards[team.id]} />
                    ) : (
                      <p className="admin__empty">Aún no hay suficientes registros para mostrar sus patrones.</p>
                    )
                  }
                />
              </TeamAccordion>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
