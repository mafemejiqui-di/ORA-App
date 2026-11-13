import { useState, type ReactNode } from "react";
import { Avatar } from "../../components/Avatar";
import { UserCode } from "../../components/UserCode";
import { getGeneration } from "../../data/catalogs";
import { getTeamTotems } from "../../data/api";
import type { TeamMember } from "../../data/teamData";
import type { Team, Totem } from "../../data/types";
import { useAsync } from "../../utils/useAsync";
import { useAdminActions } from "./useAdminActions";

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
  const [openId, setOpenId] = useState<string | null>(null);
  const { busy, request, sheet } = useAdminActions(() => {
    setOpenId(null);
    onChanged();
  });

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
                    <span className="admin-member__name">
                      <span className="admin-member__text">{member.name}</span>
                      <UserCode code={member.code} />
                    </span>
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
                        onClick={() => request({ kind: "remove", member, team })}
                      >
                        Sacar del equipo
                      </button>
                      <button
                        type="button"
                        className="admin-manage__action is-danger"
                        disabled={busy}
                        onClick={() => request({ kind: "delete-user", member, team })}
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
        onClick={() => request({ kind: "delete-team", team, memberCount: members.length })}
      >
        Eliminar equipo
      </button>

      {sheet}
    </div>
  );
}
