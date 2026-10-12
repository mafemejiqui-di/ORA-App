import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { GenerationId, Role } from "../data/catalogs";

// Borrador del registro entre los pasos 1–3. Vive solo en memoria (la
// contraseña no se persiste); si se recarga la página se vuelve al paso 1.
export type RegistrationDraft = {
  name: string;
  email: string;
  password: string;
  role: Role | null;
  generation: GenerationId | null;
  orgName: string;
  teamCode: string;
};

const EMPTY_DRAFT: RegistrationDraft = {
  name: "",
  email: "",
  password: "",
  role: null,
  generation: null,
  orgName: "",
  teamCode: "",
};

type RegistrationValue = {
  draft: RegistrationDraft;
  update: (patch: Partial<RegistrationDraft>) => void;
  reset: () => void;
};

const RegistrationContext = createContext<RegistrationValue | null>(null);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<RegistrationDraft>(EMPTY_DRAFT);

  const update = useCallback((patch: Partial<RegistrationDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const value = useMemo(() => ({ draft, update, reset }), [draft, update, reset]);

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error("useRegistration debe usarse dentro de <RegistrationProvider>");
  return ctx;
}
