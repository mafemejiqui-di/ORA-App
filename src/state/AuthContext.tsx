import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  joinTeam,
  loginUser,
  logoutUser,
  onSessionChange,
  registerUser,
  restoreSession,
  saveClosing,
  saveDecision,
  saveDiagnosis,
  saveRitual,
  saveTotem,
  updateSettings,
  type RegisterInput,
  type Session,
} from "../data/api";
import type { ClosingEntry, DecisionEntry, DiagnosisEntry, RitualEntry, Team, Totem, User, UserSettings } from "../data/types";
import { toLocalIso } from "../utils/ritual";

type AuthValue = {
  user: User | null;
  team: Team | null;
  /** true mientras se recupera la sesión guardada al abrir la app. */
  loading: boolean;
  /** register y login devuelven el usuario para poder decidir a qué pantalla ir. */
  register: (input: RegisterInput) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  saveTotem: (totem: Totem) => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  /** Guarda el ritual del día de `date` (por defecto, hoy). */
  saveRitual: (entry: RitualEntry, date?: Date) => Promise<void>;
  /** Une a la persona a un equipo con su código; devuelve el equipo. */
  joinTeam: (teamCode: string) => Promise<Team | null>;
  /** Guarda "Ver cómo estamos" del ciclo en curso del equipo. */
  saveDiagnosis: (entry: DiagnosisEntry) => Promise<void>;
  /** Registra una decisión en "Tomar una decisión". */
  saveDecision: (entry: DecisionEntry) => Promise<void>;
  /** Guarda "Cierre del ciclo" del ciclo en curso del equipo. */
  saveClosing: (entry: ClosingEntry) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Evita que la sesión recuperada al abrir pise un login que ocurrió mientras tanto.
  const touched = useRef(false);

  useEffect(() => {
    let alive = true;
    void restoreSession().then((restored) => {
      if (!alive) return;
      if (!touched.current) setSession(restored);
      setLoading(false);
    });
    // Sesión cerrada en otra pestaña o vencida.
    const unsubscribe = onSessionChange((signedIn) => {
      if (!signedIn) setSession(null);
    });
    // Al volver a la app (p. ej. otro día o tras cambiar de ciclo) se refrescan perfil, equipo y registros.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void restoreSession().then((fresh) => {
        if (alive && fresh) setSession((prev) => (prev ? fresh : prev));
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const apply = useCallback((next: Session) => {
    touched.current = true;
    setSession(next);
    return next;
  }, []);

  const register = useCallback(async (input: RegisterInput) => apply(await registerUser(input)).user, [apply]);

  const login = useCallback(
    async (email: string, password: string) => apply(await loginUser(email, password)).user,
    [apply],
  );

  const saveUserTotem = useCallback(async (totem: Totem) => void apply(await saveTotem(totem)), [apply]);

  const updateUserSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!session) return;
      apply(await updateSettings(session.user.settings, patch));
    },
    [session, apply],
  );

  const saveUserRitual = useCallback(
    async (entry: RitualEntry, date = new Date()) => void apply(await saveRitual(toLocalIso(date), entry)),
    [apply],
  );

  const joinUserTeam = useCallback(async (teamCode: string) => apply(await joinTeam(teamCode)).team, [apply]);

  const saveUserDiagnosis = useCallback(async (entry: DiagnosisEntry) => void apply(await saveDiagnosis(entry)), [apply]);

  const saveUserDecision = useCallback(async (entry: DecisionEntry) => void apply(await saveDecision(entry)), [apply]);

  const saveUserClosing = useCallback(async (entry: ClosingEntry) => void apply(await saveClosing(entry)), [apply]);

  const logout = useCallback(() => {
    touched.current = true;
    setSession(null);
    void logoutUser();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      team: session?.team ?? null,
      loading,
      register,
      login,
      saveTotem: saveUserTotem,
      updateSettings: updateUserSettings,
      saveRitual: saveUserRitual,
      joinTeam: joinUserTeam,
      saveDiagnosis: saveUserDiagnosis,
      saveDecision: saveUserDecision,
      saveClosing: saveUserClosing,
      logout,
    }),
    [
      session,
      loading,
      register,
      login,
      saveUserTotem,
      updateUserSettings,
      saveUserRitual,
      joinUserTeam,
      saveUserDiagnosis,
      saveUserDecision,
      saveUserClosing,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
