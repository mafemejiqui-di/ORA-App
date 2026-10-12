import { useState } from "react";
import plusIcon from "../../../assets/icons/plus.svg";
import totemTriangle from "../../../assets/icons/totem-triangle-12.svg";
import { Avatar } from "../../../components/Avatar";
import { Button } from "../../../components/Button";
import { Pill, type PillTone } from "../../../components/Pill";
import { TeamCodeCard } from "../../../components/TeamCodeCard";
import { TeamPatterns } from "../../../components/TeamPatterns";
import { useToast } from "../../../components/Toast";
import { getGeneration, type GenerationId } from "../../../data/catalogs";
import { ApiError, getTeamMembers } from "../../../data/api";
import { useAuth } from "../../../state/AuthContext";
import { useTeamDashboard } from "../../../state/useTeamDashboard";
import { useLiveAsync } from "../../../utils/useLiveAsync";
import { AdminTeams } from "../../admin/AdminTeams";
import "./Team.css";

/** "XXXX-XXXX": el botón se habilita con el código completo. */
const TEAM_CODE_LENGTH = 9;

const GENERATION_TONE: Record<GenerationId, PillTone> = {
  boomers: "peach",
  "gen-x": "indigo",
  millennials: "teal-deep",
  "gen-z": "teal",
};

export function Team() {
  const { user, team, joinTeam } = useAuth();
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const teamId = team?.id ?? null;
  // Integrantes y patrones se actualizan solos cuando alguien del equipo entra o responde.
  const roster = useLiveAsync(
    () => getTeamMembers(user?.isAdmin ? null : teamId),
    [teamId, user?.isAdmin],
    !user?.isAdmin && teamId ? teamId : undefined,
  );
  const dashboard = useTeamDashboard();
  const members = roster.data ?? [];

  // La administradora ve todos los equipos.
  if (user?.isAdmin) return <AdminTeams />;

  async function join() {
    setJoining(true);
    try {
      const joined = await joinTeam(code);
      if (joined) showToast(`Te uniste a ${joined.name}`, "primary");
    } catch (err) {
      setCodeError(err instanceof ApiError ? err.message : "No pudimos unirte al equipo. Inténtalo de nuevo.");
    } finally {
      setJoining(false);
    }
  }

  async function copyInvite() {
    if (!team) return;
    const link = `${window.location.origin}/registro/1?equipo=${team.code}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast("Enlace copiado", "primary");
    } catch {
      // Sin permiso de portapapeles (p. ej. abierto por http en la red local).
      showToast(`Código del equipo: ${team.code}`, "primary");
    }
  }

  return (
    <main className="team">
      <header className="team__header">
        <h1 className="team__title">Equipo</h1>
      </header>

      {!team ? (
        <section className="team__section">
          <p className="team__empty">Todavía no perteneces a un equipo.</p>
          <TeamCodeCard
            className="team__join"
            value={code}
            error={codeError}
            onChange={(next) => {
              setCode(next);
              setCodeError(null);
            }}
          >
            <Button className="team__join-button" disabled={joining || code.length < TEAM_CODE_LENGTH} onClick={() => void join()}>
              Unirme al equipo
            </Button>
          </TeamCodeCard>
        </section>
      ) : (
        <>
          <section className="team__section" aria-labelledby="team-members-label">
            <h2 className="section-label" id="team-members-label">
              Integrantes
            </h2>

            {roster.loading && <p className="team__caption">Cargando integrantes…</p>}
            {Boolean(roster.error) && (
              <p className="team__caption">
                No pudimos cargar los integrantes.{" "}
                <button type="button" className="team__retry" onClick={roster.reload}>
                  Reintentar
                </button>
              </p>
            )}
            <ul className="team__members">
              {members.map((member) => {
                const generation = getGeneration(member.generation);
                const subtitle = [member.role, generation?.compact].filter(Boolean).join(" · ");
                return (
                  <li key={member.id} className="team-member">
                    <Avatar name={member.name} />
                    <div className="team-member__info">
                      <p className="team-member__name">
                        <span className="team-member__name-text">{member.name}</span>
                        {member.hasTotem && (
                          <img src={totemTriangle} width={12} height={12} alt="Tótem activo" title="Tótem activo" />
                        )}
                      </p>
                      <p className="team-member__role">{subtitle || "Sin rol ni generación"}</p>
                    </div>
                    {generation && (
                      <Pill tone={GENERATION_TONE[generation.id]} size="sm">
                        {generation.compact}
                      </Pill>
                    )}
                  </li>
                );
              })}
            </ul>

            <button type="button" className="team__invite" onClick={() => void copyInvite()}>
              <img src={plusIcon} width={18} height={18} alt="" />
              Invitar al equipo
            </button>
          </section>

          <section className="team__section team__section--patterns" aria-labelledby="team-patterns-label">
            <h2 className="section-label" id="team-patterns-label">
              Patrones del equipo
            </h2>
            <p className="team__caption">Basado en los registros del ciclo actual · anónimo</p>
            {dashboard.data ? (
              <TeamPatterns dashboard={dashboard.data} />
            ) : (
              <p className="team__empty">{dashboard.error ? "No pudimos cargar los patrones." : "Cargando patrones…"}</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
