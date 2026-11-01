import { useState } from "react";
import { ConfirmSheet } from "../../components/ConfirmSheet";
import { useToast } from "../../components/Toast";
import { ApiError, deleteTeam, deleteUserAccount, removeMemberFromTeam } from "../../data/api";
import type { TeamMember } from "../../data/teamData";
import type { Team } from "../../data/types";

export type AdminAction =
  | { kind: "remove"; member: TeamMember; team: Team }
  | { kind: "delete-user"; member: TeamMember; team: Team }
  | { kind: "delete-team"; team: Team; memberCount: number };

/**
 * Sacar del equipo, eliminar cuenta y eliminar equipo (admin), con su confirmación.
 * `request` abre la confirmación; `sheet` se pone una vez en la pantalla.
 */
export function useAdminActions(onDone: () => void) {
  const { showToast } = useToast();
  const [pending, setPending] = useState<AdminAction | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!pending) return;
    const action = pending;
    setPending(null);
    setBusy(true);
    try {
      if (action.kind === "remove") {
        await removeMemberFromTeam(action.member.id);
        showToast(`${action.member.name} ya no está en ${action.team.name}.`, "primary");
      } else if (action.kind === "delete-user") {
        await deleteUserAccount(action.member.id);
        showToast(`Se eliminó la cuenta de ${action.member.name}.`, "primary");
      } else {
        await deleteTeam(action.team.id);
        showToast(`Se eliminó el equipo ${action.team.name}.`, "primary");
      }
      onDone();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "No pudimos hacerlo. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const copy = pending && confirmCopy(pending);
  const sheet = (
    <ConfirmSheet
      open={copy !== null}
      title={copy?.title ?? ""}
      message={copy?.message ?? ""}
      confirmLabel={copy?.confirmLabel ?? ""}
      cancelLabel="Cancelar"
      onConfirm={() => void confirm()}
      onCancel={() => setPending(null)}
    />
  );

  return { busy, request: setPending, sheet };
}

function confirmCopy(action: AdminAction) {
  if (action.kind === "remove") {
    return {
      title: `¿Sacar a ${action.member.name} de ${action.team.name}?`,
      message: "Conservará su cuenta y quedará sin equipo. Podrá volver a unirse con el código del equipo.",
      confirmLabel: "Sacar del equipo",
    };
  }
  if (action.kind === "delete-user") {
    return {
      title: `¿Eliminar la cuenta de ${action.member.name}?`,
      message: "Se borrarán su cuenta, su Tótem y todos sus registros. Esto no se puede deshacer.",
      confirmLabel: "Eliminar cuenta",
    };
  }
  const n = action.memberCount;
  const people =
    n === 0
      ? "No tiene integrantes."
      : `${n === 1 ? "Su integrante conservará su cuenta y quedará" : `Sus ${n} integrantes conservarán su cuenta y quedarán`} sin equipo.`;
  return {
    title: `¿Eliminar el equipo ${action.team.name}?`,
    message: `Se borrarán sus ciclos, respuestas y lecturas. ${people} Esto no se puede deshacer.`,
    confirmLabel: "Eliminar equipo",
  };
}
