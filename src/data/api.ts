// API de ORA sobre Supabase (reemplaza la API simulada sobre localStorage).
// La privacidad la aplica la base de datos con sus reglas RLS (ver supabase/01_schema.sql):
// aquí solo se pide lo que la persona tiene derecho a ver.
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getCycleWindow } from "../utils/cycle";
import type { GenerationId, Role } from "./catalogs";
import type { TeamMember } from "./teamData";
import {
  DEFAULT_SETTINGS,
  type ClosingEntry,
  type DecisionEntry,
  type DiagnosisEntry,
  type RitualEntry,
  type Team,
  type Totem,
  type User,
  type UserSettings,
} from "./types";

export type ApiErrorCode =
  | "email-taken"
  | "invalid-credentials"
  | "team-code-not-found"
  | "team-name-required"
  | "outside-window"
  | "already-answered"
  | "no-team"
  | "not-authenticated"
  | "confirm-email"
  | "network"
  | "unknown";

const MESSAGES: Record<ApiErrorCode, string> = {
  "email-taken": "Este correo ya tiene una cuenta.",
  "invalid-credentials": "Correo o contraseña incorrectos.",
  "team-code-not-found": "No encontramos un equipo con ese código.",
  "team-name-required": "Escribe el nombre de tu organización.",
  "outside-window": "Este módulo no está abierto en esta semana del ciclo.",
  "already-answered": "Ya respondiste este módulo en el ciclo actual.",
  "no-team": "Únete a un equipo para empezar tu ciclo.",
  "not-authenticated": "Tu sesión ya no es válida. Inicia sesión de nuevo.",
  "confirm-email": "Revisa tu correo para confirmar la cuenta y luego inicia sesión.",
  network: "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  unknown: "Algo salió mal. Inténtalo de nuevo.",
};

export class ApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode, message = MESSAGES[code]) {
    super(message);
    this.code = code;
  }
}

/** Traduce un error de Supabase (o de red) a un ApiError con mensaje en español. */
function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const message = (err as PostgrestError | Error | null)?.message ?? "";
  // Las funciones de la base de datos lanzan el código corto como mensaje.
  const known = (Object.keys(MESSAGES) as ApiErrorCode[]).find((code) => message === code);
  if (known) return new ApiError(known);
  if (/failed to fetch|network/i.test(message)) return new ApiError("network");
  if (/JWT|not authenticated|session/i.test(message)) return new ApiError("not-authenticated");
  console.error("[ORA api]", err);
  return new ApiError("unknown");
}

/** Lanza el error de una respuesta de Supabase y devuelve sus datos. */
function unwrap<T>({ data, error }: { data: T; error: PostgrestError | null }): T {
  if (error) throw toApiError(error);
  return data;
}

// ── Mapeo de filas de la base de datos a los tipos de la app ──────────

type TeamRow = { id: string; name: string; code: string; cycle_anchor: string };

const isoOf = (timestamp: string) => new Date(timestamp).toISOString();

function toTeam(row: TeamRow, now = new Date()): Team {
  const window = getCycleWindow(row.cycle_anchor, now);
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    cycleNumber: window.number,
    cycleStartedAt: window.startsAt,
    firstCycleStartedAt: isoOf(row.cycle_anchor),
  };
}

export type Session = { user: User; team: Team | null };

/** Arma la sesión completa de quien inició sesión: perfil, equipo y sus registros privados. */
async function loadSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const userId = session.user.id;

  const [profile, totem, rituals, diagnoses, decisions, closings] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle().then(unwrap),
    supabase.from("totems").select("*").eq("user_id", userId).maybeSingle().then(unwrap),
    supabase.from("rituals").select("*").eq("user_id", userId).then(unwrap),
    supabase.from("diagnoses").select("*, cycle:cycles(starts_at)").eq("user_id", userId).then(unwrap),
    supabase.from("decisions").select("*").eq("user_id", userId).order("saved_at").then(unwrap),
    supabase.from("closings").select("*, cycle:cycles(starts_at)").eq("user_id", userId).then(unwrap),
  ]);
  // Cuenta sin perfil (no debería pasar: lo crea la base de datos al registrarse).
  if (!profile) return null;

  const team = profile.team_id
    ? await supabase.from("teams").select("id, name, code, cycle_anchor").eq("id", profile.team_id).maybeSingle().then(unwrap)
    : null;

  // Los diagnósticos y cierres se guardan por ciclo; la app los busca por la fecha de inicio del ciclo.
  const cycleKey = (row: { cycle_id: string; cycle: { starts_at: string } | null }) =>
    row.cycle ? isoOf(row.cycle.starts_at) : row.cycle_id;

  const user: User = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as Role | null,
    generation: profile.generation as GenerationId | null,
    teamId: profile.team_id,
    isAdmin: profile.is_admin,
    createdAt: profile.created_at,
    settings: { ...DEFAULT_SETTINGS, ...(profile.settings as Partial<UserSettings>) },
    totem: totem
      ? {
          persona: totem.persona,
          equipoSobra: totem.equipo_sobra,
          equipoFalta: totem.equipo_falta,
          accion: totem.accion,
          savedAt: totem.saved_at,
        }
      : null,
    rituals: Object.fromEntries(
      (rituals ?? []).map((r) => [r.day, { estado: r.estado, reflexiones: r.reflexiones, intencion: r.intencion, savedAt: r.saved_at }]),
    ),
    diagnoses: Object.fromEntries(
      (diagnoses ?? []).map((d) => [cycleKey(d), { estado: d.estado, sentir: d.sentir, actitud: d.actitud, savedAt: d.saved_at }]),
    ),
    decisions: (decisions ?? []).map((d) => ({ tipo: d.tipo, frenos: d.frenos, urgencia: d.urgencia, savedAt: d.saved_at })),
    closings: Object.fromEntries(
      (closings ?? []).map((c) => [
        cycleKey(c),
        { comparacion: c.comparacion, funciono: c.funciono, intenciones: c.intenciones, savedAt: c.saved_at },
      ]),
    ),
  };

  return { user, team: team ? toTeam(team) : null };
}

async function requireSession(): Promise<Session> {
  const session = await loadSession();
  if (!session) throw new ApiError("not-authenticated");
  return session;
}

async function currentUserId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new ApiError("not-authenticated");
  return session.user.id;
}

/** Envuelve una operación: traduce sus errores y devuelve la sesión actualizada. */
async function mutate(operation: () => Promise<unknown>): Promise<Session> {
  try {
    await operation();
    return await requireSession();
  } catch (err) {
    throw toApiError(err);
  }
}

// ── Sesión ────────────────────────────────────────────────────────────

export async function restoreSession(): Promise<Session | null> {
  try {
    return await loadSession();
  } catch {
    return null;
  }
}

/** Avisa cuando la sesión se cierra o se renueva en otra pestaña o al vencerse. */
export function onSessionChange(callback: (signedIn: boolean) => void) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || event === "SIGNED_IN") callback(Boolean(session));
  });
  return () => data.subscription.unsubscribe();
}

export async function isEmailTaken(email: string): Promise<boolean> {
  try {
    return unwrap(await supabase.rpc("is_email_taken", { p_email: email }));
  } catch {
    // Si falla la consulta, se deja seguir: el registro final vuelve a comprobarlo.
    return false;
  }
}

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: Role | null;
  generation: GenerationId | null;
  orgName: string;
  teamCode: string;
};

export async function registerUser(input: RegisterInput): Promise<Session> {
  try {
    const code = input.teamCode.trim().toUpperCase();
    const orgName = input.orgName.trim();

    // El código se comprueba antes de crear la cuenta, para no dejarla a medias.
    if (code && !unwrap(await supabase.rpc("team_code_exists", { p_code: code }))) {
      throw new ApiError("team-code-not-found");
    }

    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: { data: { name: input.name.trim(), role: input.role, generation: input.generation } },
    });
    if (error) {
      if (/already registered|already exists/i.test(error.message)) throw new ApiError("email-taken");
      throw toApiError(error);
    }
    // Con "Confirm email" activado en Supabase no hay sesión hasta confirmar el correo.
    if (!data.session) throw new ApiError("confirm-email");

    // Unirse por código, o crear un equipo nuevo con el nombre de la organización.
    if (code) unwrap(await supabase.rpc("join_team", { p_code: code }));
    else if (orgName) unwrap(await supabase.rpc("create_team", { p_name: orgName }));

    return await requireSession();
  } catch (err) {
    throw toApiError(err);
  }
}

export async function loginUser(email: string, password: string): Promise<Session> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) throw new ApiError("invalid-credentials");
    if (/email not confirmed/i.test(error.message)) throw new ApiError("confirm-email");
    throw toApiError(error);
  }
  return requireSession();
}

export async function logoutUser() {
  await supabase.auth.signOut();
}

// ── Datos personales ──────────────────────────────────────────────────

export function saveTotem(totem: Totem): Promise<Session> {
  return mutate(async () => {
    const userId = await currentUserId();
    unwrap(
      await supabase.from("totems").upsert({
        user_id: userId,
        persona: totem.persona,
        equipo_sobra: totem.equipoSobra,
        equipo_falta: totem.equipoFalta,
        accion: totem.accion,
        saved_at: totem.savedAt,
      }),
    );
  });
}

export function updateSettings(current: UserSettings | undefined, patch: Partial<UserSettings>): Promise<Session> {
  return mutate(async () => {
    const userId = await currentUserId();
    unwrap(
      await supabase
        .from("profiles")
        .update({ settings: { ...DEFAULT_SETTINGS, ...current, ...patch } })
        .eq("id", userId),
    );
  });
}

/** Guarda el ritual de un día (YYYY-MM-DD). Si ya había uno ese día, lo reemplaza. */
export function saveRitual(date: string, entry: RitualEntry): Promise<Session> {
  return mutate(async () => {
    const userId = await currentUserId();
    unwrap(
      await supabase.from("rituals").upsert(
        {
          user_id: userId,
          day: date,
          estado: entry.estado,
          reflexiones: entry.reflexiones,
          intencion: entry.intencion,
          saved_at: entry.savedAt,
        },
        { onConflict: "user_id,day" },
      ),
    );
  });
}

// ── Módulos del ciclo (las semanas las valida la base de datos) ───────

export function saveDiagnosis(entry: DiagnosisEntry): Promise<Session> {
  return mutate(async () =>
    unwrap(await supabase.rpc("save_diagnosis", { p_estado: entry.estado, p_sentir: entry.sentir, p_actitud: entry.actitud })),
  );
}

export function saveDecision(entry: DecisionEntry): Promise<Session> {
  return mutate(async () =>
    unwrap(await supabase.rpc("save_decision", { p_tipo: entry.tipo, p_frenos: entry.frenos, p_urgencia: entry.urgencia })),
  );
}

export function saveClosing(entry: ClosingEntry): Promise<Session> {
  return mutate(async () =>
    unwrap(
      await supabase.rpc("save_closing", {
        p_comparacion: entry.comparacion,
        p_funciono: entry.funciono,
        p_intenciones: entry.intenciones,
      }),
    ),
  );
}

// ── Equipos ───────────────────────────────────────────────────────────

/** Vincula a un equipo existente a quien omitió el código al crear su cuenta. */
export function joinTeam(teamCode: string): Promise<Session> {
  return mutate(async () => unwrap(await supabase.rpc("join_team", { p_code: teamCode.trim().toUpperCase() })));
}

type MemberRow = { id: string; name: string; role: string | null; generation: string | null; has_totem: boolean };

/** Integrantes del equipo (la base de datos solo deja verlos a sus integrantes y a la admin). */
export async function getTeamMembers(teamId: string | null): Promise<TeamMember[]> {
  if (!teamId) return [];
  try {
    const rows = unwrap(await supabase.rpc("get_team_members", { p_team: teamId })) as MemberRow[];
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role as Role | null,
      generation: m.generation as GenerationId | null,
      hasTotem: m.has_totem,
    }));
  } catch (err) {
    throw toApiError(err);
  }
}

// ── Tablero del equipo (patrones, avance e historial; ver 02_patterns.sql) ──

export type CycleModule = "diagnosis" | "decision" | "closing";

/** Un ciclo del historial. Los promedios llegan en null si respondieron menos de 3 personas. */
export type CycleSummary = {
  number: number;
  startsAt: string;
  endsAt: string;
  current: boolean;
  diagnoses: number;
  /** Energía promedio (1–5). */
  energy: number | null;
  /** Generación con más fricción, "baja" si ninguna pasa de 0.5, null sin datos suficientes. */
  friction: GenerationId | "baja" | null;
  decisions: number;
  /** Clima de cierre promedio (1 = Peor … 5 = Mucho mejor). */
  climate: number | null;
};

export type TeamDashboard = {
  cycle: { number: number; startsAt: string; endsAt: string; week: number };
  members: number;
  /** Mínimo de personas para mostrar un grupo (privacidad). */
  minGroup: number;
  /** Personas que respondieron cada módulo en el ciclo en curso. */
  progress: Record<CycleModule, number>;
  /** Fricción promedio (0–1) y % del total, solo generaciones con respuestas suficientes. */
  friction: { generation: GenerationId; value: number; share: number }[];
  /** Temas de tensión del ciclo (máximo 3, valor relativo 0–1). */
  tension: { label: string; value: number }[];
  /** Tensión promedio (0–1) por módulo y generación; "mixed" = todo el equipo. Sin llave = sin datos. */
  dotmap: Partial<Record<CycleModule, Partial<Record<GenerationId | "mixed", number>>>>;
  history: CycleSummary[];
};

export async function getTeamDashboard(teamId: string): Promise<TeamDashboard> {
  try {
    return unwrap(await supabase.rpc("get_team_dashboard", { p_team: teamId })) as TeamDashboard;
  } catch (err) {
    throw toApiError(err);
  }
}

/**
 * Avisa cada vez que hay actividad nueva en el equipo (o en cualquiera, si `teamId` es null:
 * administradora). Usa Supabase Realtime sobre `teams.activity_at`; devuelve cómo cancelar.
 */
export function subscribeTeamActivity(teamId: string | null, onActivity: () => void) {
  const channel = supabase
    .channel(`team-activity-${teamId ?? "all"}-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "teams", ...(teamId ? { filter: `id=eq.${teamId}` } : {}) },
      () => onActivity(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

// ── Lectura semanal con IA (Gemini; ver supabase/03_insights.sql y functions/lectura-semanal) ──

export type TeamInsight = {
  id: string;
  cycleNumber: number;
  week: number;
  /** ok: lectura lista · insufficient: menos de 3 personas respondieron · error: la IA falló (se reintenta). */
  status: "ok" | "insufficient" | "error";
  resumen: string | null;
  patron: string | null;
  sugerencia: string | null;
  createdAt: string;
};

type InsightRow = {
  id: string;
  cycle_number: number;
  week: number;
  status: TeamInsight["status"];
  resumen: string | null;
  patron: string | null;
  sugerencia: string | null;
  created_at: string;
};

/** Lecturas del equipo, de la más reciente a la más antigua. */
export async function getTeamInsights(teamId: string): Promise<TeamInsight[]> {
  try {
    const rows = unwrap(
      await supabase
        .from("team_insights")
        .select("id, cycle_number, week, status, resumen, patron, sugerencia, created_at")
        .eq("team_id", teamId)
        .order("cycle_number", { ascending: false })
        .order("week", { ascending: false }),
    ) as InsightRow[] | null;
    return (rows ?? []).map((r) => ({
      id: r.id,
      cycleNumber: r.cycle_number,
      week: r.week,
      status: r.status,
      resumen: r.resumen,
      patron: r.patron,
      sugerencia: r.sugerencia,
      createdAt: r.created_at,
    }));
  } catch (err) {
    throw toApiError(err);
  }
}

/**
 * Pide a la Edge Function la lectura de la última semana terminada (si ya existe, no hace nada).
 * Nunca lanza error: si la IA no está disponible, la app sigue funcionando sin lectura.
 */
export async function ensureWeeklyInsight(teamId: string): Promise<void> {
  try {
    await supabase.functions.invoke("lectura-semanal", { body: { teamId } });
  } catch (err) {
    console.warn("[ORA] lectura semanal no disponible", err);
  }
}

// ── Semanas del equipo (tensiones semana por semana; ver supabase/04_weeks.sql) ──

export type TeamWeek = {
  cycleNumber: number;
  week: number;
  startsAt: string;
  endsAt: string;
  /** La semana todavía no termina. */
  current: boolean;
  /** Personas que registraron algo esa semana. */
  respondents: number;
  /** Temas con más tensión esa semana (máximo 3, valor relativo 0–1); vacío con menos de 3 personas. */
  tension: { label: string; value: number }[];
};

/** Todas las semanas del equipo, de la más antigua a la más reciente. */
export async function getTeamWeeks(teamId: string): Promise<TeamWeek[]> {
  try {
    return (unwrap(await supabase.rpc("get_team_weeks", { p_team: teamId })) as TeamWeek[] | null) ?? [];
  } catch (err) {
    throw toApiError(err);
  }
}

// ── Administradora ────────────────────────────────────────────────────

/** Datos que ve la administradora: equipos, integrantes, uso diario y patrones (todo agregado). */
export type AdminSnapshot = {
  teams: Team[];
  members: Record<string, TeamMember[]>;
  /** Días (YYYY-MM-DD) en que cada integrante usó la app, sin el contenido de sus registros. */
  activity: Record<string, string[]>;
  /** Por equipo y día: dispersión de estados y promedio por generación (solo grupos de 3+). */
  daily: Record<string, Record<string, { spread: number; generations: { generation: GenerationId; avg: number }[] }>>;
  /** Temas de tensión de los últimos 7 días por equipo. */
  tension: Record<string, { label: string; value: number }[]>;
  /** Tablero de cada equipo (patrones del ciclo en curso). */
  dashboards: Record<string, TeamDashboard>;
  /** Lecturas de la IA de cada equipo, de la más reciente a la más antigua. */
  insights: Record<string, TeamInsight[]>;
  /** Semanas de cada equipo con sus tensiones, de la más antigua a la más reciente. */
  weeks: Record<string, TeamWeek[]>;
};

/** Menciones de tensión y su porcentaje del total (ver supabase/05_admin_report.sql). */
export type TensionShares = {
  /** Personas que registraron tensiones y total de menciones; temas con su conteo y % del total. */
  total: number;
  people: number;
  themes: { label: string; count: number; share: number }[];
};

export type AdminTensionReport = {
  days: number;
  /** Por equipo; falta el equipo si tuvo menos de 3 personas con registros. */
  teams: Record<string, TensionShares>;
  /** Todos los equipos juntos; null con menos de 3 personas. */
  overall: TensionShares | null;
};

export async function getAdminTensionShares(days = 14): Promise<AdminTensionReport> {
  try {
    const data = unwrap(await supabase.rpc("get_admin_tension_shares", { p_days: days })) as AdminTensionReport | null;
    return { days, teams: data?.teams ?? {}, overall: data?.overall ?? null };
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  try {
    const rows = unwrap(
      await supabase.from("teams").select("id, name, code, cycle_anchor").order("created_at"),
    ) as TeamRow[];
    const teams = rows.map((row) => toTeam(row));
    const [overview, memberLists, dashboards, insightLists] = await Promise.all([
      supabase.rpc("get_admin_overview", { p_days: 14 }).then(unwrap),
      Promise.all(teams.map((t) => getTeamMembers(t.id))),
      Promise.all(teams.map((t) => getTeamDashboard(t.id))),
      // Si falta la lectura de la última semana de algún equipo, se genera en segundo plano.
      Promise.all(teams.map((t) => getTeamInsights(t.id).catch(() => [] as TeamInsight[]))),
    ]);
    const weekLists = await Promise.all(teams.map((t) => getTeamWeeks(t.id).catch(() => [] as TeamWeek[])));
    teams.forEach((t) => void ensureWeeklyInsight(t.id));
    return {
      teams,
      members: Object.fromEntries(teams.map((t, i) => [t.id, memberLists[i]])),
      activity: overview?.activity ?? {},
      daily: overview?.daily ?? {},
      tension: overview?.tension ?? {},
      dashboards: Object.fromEntries(teams.map((t, i) => [t.id, dashboards[i]])),
      insights: Object.fromEntries(teams.map((t, i) => [t.id, insightLists[i]])),
      weeks: Object.fromEntries(teams.map((t, i) => [t.id, weekLists[i]])),
    };
  } catch (err) {
    throw toApiError(err);
  }
}
