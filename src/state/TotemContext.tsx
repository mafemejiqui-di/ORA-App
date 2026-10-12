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
  update: (patch: Partial<TotemDraft>) => void;
  reset: () => void;
};

const TotemDraftContext = createContext<TotemDraftValue | null>(null);

export function TotemDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<TotemDraft>(EMPTY_DRAFT);

  const update = useCallback((patch: Partial<TotemDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const value = useMemo(() => ({ draft, update, reset }), [draft, update, reset]);

  return <TotemDraftContext.Provider value={value}>{children}</TotemDraftContext.Provider>;
}

export function useTotemDraft() {
  const ctx = useContext(TotemDraftContext);
  if (!ctx) throw new Error("useTotemDraft debe usarse dentro de <TotemDraftProvider>");
  return ctx;
}
