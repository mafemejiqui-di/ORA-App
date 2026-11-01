import { useState, type ReactNode } from "react";
import { Avatar } from "../../components/Avatar";
import { ConfirmSheet } from "../../components/ConfirmSheet";
import { useToast } from "../../components/Toast";
import { getGeneration } from "../../data/catalogs";
import { ApiError, deleteTeam, deleteUserAccount, getTeamTotems, removeMemberFromTeam } from "../../data/api";
import type { TeamMember } from "../../data/teamData";
import type { Team, Totem } from "../../data/types";
import { useAsync } from "../../utils/useAsync";

type TeamManageProps = {
  team: Team;
  members: TeamMember[];
  /** Días sin usar la app de quienes tienen alerta (null = sin uso en las últimas 2 semanas). */
  inactiveById: Map<string, number | null>;
  /** Patrones del equipo (se muestran entre los integrantes y "Eliminar equipo"). */
  patterns: ReactNode;
  /** Vuelve a pedir los datos de la admin tras sacar, eliminar o borrar el equipo. */
  onChanged: () => void;
};

type Pending =
  | { kind: "remove"; member: TeamMember }
  | { kind: "delete-user"; member: TeamMember }
  | { kind: "delete-team" };

// Las preguntas del Tótem, con los mismos textos que ve cada integrante al responderlo.
const TOTEM_ROWS: { label: string; key: keyof Omit<Totem, "savedAt"> }[] = [
  { label: "Frente a un proyecto del equipo, lo primero que hace", key: "persona" },
  { label: "Lo que aporta", key: "equipoSobra" },
  { label: "Lo que el equipo necesita de esta persona", key: "equipoFalta" },
  { label: "Hoy lidera desde", key: "accion" },
];

/** Contenido de un equipo en Equipos (admin): integrantes con su Tótem y acciones, patrones y eliminar equipo. */
export function TeamManage({ team, members, inactiveById, patterns, onChanged }: TeamManageProps) {
  const totems = useAsync(() => getTeamTotems(team.id), [team.id]);
  const { showToast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!pending) return;
    const action = pending;
    setPending(null);
    setBusy(true);
    try {
      if (action.kind === "remove") {
        await removeMemberFromTeam(action.member.id);
        showToast(`${action.member.name} ya no está en ${team.name}.`, "primary");
      } else if (action.kind === "delete-user") {
        await deleteUserAccount(action.member.id);
        showToast(`Se eliminó la cuenta de ${action.member.name}.`, "primary");
      } else {
        await deleteTeam(team.id);
        showToast(`Se eliminó el equipo ${team.name}.`, "primary");
      }
      setOpenId(null);
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "No pudimos hacerlo. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const sheet = pending && confirmCopy(pending, team, members.length);

  return (
    <div className="admin-manage">
      <h4 className="admin-manage__label">Integrantes</h4>
      {members.length === 0 ? (
        <p className="admin__caption admin__caption--inline">Aún no tiene integrantes.</p>
      ) : (
        <ul className="admin-members">
          {members.map((member) => {
            const open = openId === member.id;
            const role = [member.role, getGeneration(member.generation)?.compact].filter(Boolean).join(" · ");
            const inactive = inactiveById.get(member.id);
            const totem = totems.data?.[member.id];
            return (
              <li key={member.id} className="admin-manage__member">
                <button
                  type="button"
                  className="admin-member admin-manage__toggle"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : member.id)}
                >
                  <Avatar name={member.name} />
                  <span className="admin-member__info">
                    <span className="admin-member__name">{member.name}</span>
                    <span className="admin-member__role">{role || "Sin rol ni generación"}</span>
                  </span>
                  {inactiveById.has(member.id) && (
                    <span className="admin-member__status is-alert">
                      ⚠ {inactive === null ? "Sin uso" : `${inactive} días`}
                    </span>
                  )}
                  <span className="admin-accordion__chevron" aria-hidden="true" />
                </button>

                {open && (
                  <div className="admin-manage__detail">
                    <p className="admin-manage__label">Tótem</p>
                    {totems.loading && !totems.data ? (
                      <p className="admin-manage__muted">Cargando…</p>
                    ) : totems.error ? (
                      <p className="admin-manage__muted">
                        No pudimos cargar el Tótem.{" "}
                        <button type="button" className="admin__retry" onClick={totems.reload}>
                          Reintentar
                        </button>
                      </p>
                    ) : totem ? (
                      <dl className="admin-totem">
                        {TOTEM_ROWS.map((row) => (
                          <div key={row.key} className="admin-totem__row">
                            <dt>{row.label}</dt>
                            <dd>{totem[row.key] || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="admin-manage__muted">Aún no ha escrito su Tótem.</p>
                    )}

                    <div className="admin-manage__actions">
                      <button
                        type="button"
                        className="admin-manage__action"
                        disabled={busy}
                        onClick={() => setPending({ kind: "remove", member })}
                      >
                        Sacar del equipo
                      </button>
                      <button
                        type="button"
                        className="admin-manage__action is-danger"
                        disabled={busy}
                        onClick={() => setPending({ kind: "delete-user", member })}
                      >
                        Eliminar cuenta
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h4 className="admin-manage__label admin-manage__label--spaced">Patrones del equipo</h4>
      {patterns}

      <button
        type="button"
        className="admin-manage__delete-team"
        disabled={busy}
        onClick={() => setPending({ kind: "delete-team" })}
      >
        Eliminar equipo
      </button>

      <ConfirmSheet
        open={sheet !== null}
        title={sheet?.title ?? ""}
        message={sheet?.message ?? ""}
        confirmLabel={sheet?.confirmLabel ?? ""}
        cancelLabel="Cancelar"
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

function confirmCopy(pending: Pending, team: Team, memberCount: number) {
  if (pending.kind === "remove") {
    return {
      title: `¿Sacar a ${pending.member.name} de ${team.name}?`,
      message: "Conservará su cuenta y quedará sin equipo. Podrá volver a unirse con el código del equipo.",
      confirmLabel: "Sacar del equipo",
    };
  }
  if (pending.kind === "delete-user") {
    return {
      title: `¿Eliminar la cuenta de ${pending.member.name}?`,
      message: "Se borrarán su cuenta, su Tótem y todos sus registros. Esto no se puede deshacer.",
      confirmLabel: "Eliminar cuenta",
    };
  }
  const people =
    memberCount === 0
      ? "No tiene integrantes."
      : `${memberCount === 1 ? "Su integrante conservará su cuenta y quedará" : `Sus ${memberCount} integrantes conservarán su cuenta y quedarán`} sin equipo.`;
  return {
    title: `¿Eliminar el equipo ${team.name}?`,
    message: `Se borrarán sus ciclos, respuestas y lecturas. ${people} Esto no se puede deshacer.`,
    confirmLabel: "Eliminar equipo",
  };
}
