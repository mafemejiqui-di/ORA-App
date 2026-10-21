import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// Borrador de las respuestas del Tótem mientras se recorren las 3 preguntas.
// Se guarda en la cuenta solo al final ("Guardar mi tótem").
export type TotemDraft = {
  persona: string;
  equipoSobra: string;
  equipoFalta: string;
  accion: string;
};

const EMPTY_DRAFT: TotemDraft = { persona: "", equipoSobra: "", equipoFalta: "", accion: "" };

type TotemDraftValue = {
  draft: TotemDraft;
  /** true cuando se está modificando el Tótem desde Perfil (no en el registro inicial). */
  editing: boolean;
  update: (patch: Partial<TotemDraft>) => void;
  /** Abre el Tótem para modificarlo, con las respuestas actuales ya escritas. */
  startEdit: (current: TotemDraft | null | undefined) => void;
  reset: () => void;
};

const TotemDraftContext = createContext<TotemDraftValue | null>(null);

export function TotemDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<TotemDraft>(EMPTY_DRAFT);
  const [editing, setEditing] = useState(false);

  const update = useCallback((patch: Partial<TotemDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const startEdit = useCallback((current: TotemDraft | null | undefined) => {
    setDraft(
      current
        ? { persona: current.persona, equipoSobra: current.equipoSobra, equipoFalta: current.equipoFalta, accion: current.accion }
        : EMPTY_DRAFT,
    );
    setEditing(true);
  }, []);

  const reset = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setEditing(false);
  }, []);

  const value = useMemo(() => ({ draft, editing, update, startEdit, reset }), [draft, editing, update, startEdit, reset]);

  return <TotemDraftContext.Provider value={value}>{children}</TotemDraftContext.Provider>;
}

export function useTotemDraft() {
  const ctx = useContext(TotemDraftContext);
  if (!ctx) throw new Error("useTotemDraft debe usarse dentro de <TotemDraftProvider>");
  return ctx;
}
