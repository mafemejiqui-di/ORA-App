import { useEffect, useId, useRef, useState } from "react";
import chevronUp from "../../../assets/icons/chevron-up.svg";
import { ensureWeeklyInsight, getTeamInsights, type TeamInsight } from "../../../data/api";
import type { Team } from "../../../data/types";
import { days } from "../../../utils/cycle";
import { useLiveAsync } from "../../../utils/useLiveAsync";
import "./WeeklyInsight.css";

const WEEK_MS = 7 * 86_400_000;

/** Lecturas del equipo en vivo; al abrir, pide (una vez) la de la última semana terminada. */
export function useTeamInsights(teamId: string | null) {
  const state = useLiveAsync<TeamInsight[]>(
    () => (teamId ? getTeamInsights(teamId) : Promise.resolve([])),
    [teamId],
    teamId ?? undefined,
  );
  const requested = useRef<string | null>(null);
  const reload = useRef(state.reload);
  reload.current = state.reload;

  useEffect(() => {
    if (!teamId || requested.current === teamId) return;
    requested.current = teamId;
    void ensureWeeklyInsight(teamId).then(() => reload.current());
  }, [teamId]);

  return state;
}

function InsightBody({ insight }: { insight: TeamInsight }) {
  if (insight.status === "insufficient") {
    return <p className="insight__note">Esta semana respondieron menos de 3 personas, así que no hubo lectura.</p>;
  }
  if (insight.status === "error") {
    return <p className="insight__note">No pudimos escribir esta lectura. Se intentará de nuevo la próxima vez que abras la app.</p>;
  }
  return (
    <>
      <p className="insight__summary">{insight.resumen}</p>
      <InsightToggle label="Patrón principal" text={insight.patron} />
      <InsightToggle label="Sugerencia para el equipo" text={insight.sugerencia} variant="suggestion" />
    </>
  );
}

/** Bloque plegado con flecha: al tocarlo se despliega su texto. */
function InsightToggle({ label, text, variant }: { label: string; text: string | null; variant?: "suggestion" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={variant ? `insight__block insight__block--${variant}` : "insight__block"}>
      <button
        type="button"
        className="insight__toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="insight__label">{label}</span>
        <img className={open ? "insight__chevron is-open" : "insight__chevron"} src={chevronUp} width={14} height={14} alt="" />
      </button>
      <p className="insight__text" id={id} hidden={!open}>
        {text}
      </p>
    </div>
  );
}

/** "Lectura de la semana": la escribe la IA con datos anónimos del equipo al terminar cada semana. */
export function WeeklyInsight({ team }: { team: Team }) {
  const insights = useTeamInsights(team.id);
  const list = insights.data ?? [];
  const [latest, ...older] = list;

  let empty: string | null = null;
  if (!latest) {
    const anchor = team.firstCycleStartedAt ? Date.parse(team.firstCycleStartedAt) : null;
    const firstAt = anchor !== null ? anchor + WEEK_MS : null;
    empty =
      firstAt !== null && firstAt > Date.now()
        ? `La primera lectura llega al terminar la semana 1, en ${days(Math.ceil((firstAt - Date.now()) / 86_400_000))}.`
        : insights.loading
          ? "Preparando la lectura…"
          : "La lectura de la semana aparecerá aquí en unos momentos.";
  }

  return (
    <section className="insight" aria-labelledby="insight-title">
      <div className="insight__head">
        <h2 className="insight__title" id="insight-title">
          Lectura de la semana
        </h2>
        {latest && (
          <span className="insight__badge">
            Ciclo {latest.cycleNumber} · Semana {latest.week}
          </span>
        )}
      </div>

      {latest ? <InsightBody insight={latest} /> : <p className="insight__note">{empty}</p>}

      {older.length > 0 && (
        <details className="insight__older">
          <summary>Lecturas anteriores ({older.length})</summary>
          <ul className="insight__older-list">
            {older.map((item) => (
              <li key={item.id} className="insight__older-item">
                <span className="insight__badge">
                  Ciclo {item.cycleNumber} · Semana {item.week}
                </span>
                <InsightBody insight={item} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
