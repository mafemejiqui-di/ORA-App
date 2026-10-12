import { getTeamDashboard, type TeamDashboard } from "../data/api";
import { useLiveAsync } from "../utils/useLiveAsync";
import { useAuth } from "./AuthContext";

/** Tablero del equipo de quien inició sesión, actualizado en tiempo real. null sin equipo. */
export function useTeamDashboard() {
  const { user, team } = useAuth();
  const teamId = !user?.isAdmin && team ? team.id : null;
  return useLiveAsync<TeamDashboard | null>(
    () => (teamId ? getTeamDashboard(teamId) : Promise.resolve(null)),
    [teamId],
    teamId ?? undefined,
  );
}
