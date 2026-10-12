import { useState } from "react";
import { getAdminSnapshot, type AdminSnapshot, type TeamInsight, type TeamWeek } from "../../data/api";
import type { Team } from "../../data/types";
import { days, getCycleStatus, MODULE_WEEK } from "../../utils/cycle";
import { formatRange } from "../../utils/format";
import { toLocalIso } from "../../utils/ritual";
import { useLiveAsync } from "../../utils/useLiveAsync";
import { InsightBody } from "../app/cycle/WeeklyInsight";
import { AdminStatus } from "./AdminStatus";
import "../../components/TeamPatterns.css";
import "../app/cycle/WeeklyInsight.css";
import "./Admin.css";

const PHASES = [
  { week: MODULE_WEEK.diagnosis, label: "Ver cómo estamos" },
  { week: MODULE_WEEK.decision, label: "Decidir" },
  { week: MODULE_WEEK.closing, label: "Cerrar" },
];

const MS_PER_DAY = 86_400_000;

/** "11 Oct – 17 Oct" (el fin guardado es exclusivo). */
const weekRange = (w: TeamWeek) =>
  formatRange(toLocalIso(new Date(w.startsAt)), toLocalIso(new Date(Date.parse(w.endsAt) - MS_PER_DAY)));

/** Ciclo de la administradora: semana a semana de cada equipo, con sus tensiones y la lectura de la IA. */
export function AdminCycle() {
  const state = useLiveAsync(getAdminSnapshot, [], null);
  if (!state.data) return <AdminStatus title="Ciclo" state={state} />;
  const snapshot = state.data;

  return (
    <main className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Ciclo</h1>
        <p className="admin__sub">Recorre las semanas de cada equipo con las flechas</p>
      </header>

      <section className="admin__section" aria-label="Avance por equipo">
        {snapshot.teams.length === 0 && <p className="admin__empty">Aún no hay equipos registrados.</p>}
        <ul className="admin-teams">
          {snapshot.teams.map((team) => (
            <TeamCycleCard key={team.id} team={team} snapshot={snapshot} />
          ))}
        </ul>
      </section>
    </main>
  );
}

function TeamCycleCard({ team, snapshot }: { team: Team; snapshot: AdminSnapshot }) {
  const status = getCycleStatus(team);
  const weeks = snapshot.weeks[team.id] ?? [];
  const insights = snapshot.insights[team.id] ?? [];
  // null = la semana más reciente (se mantiene al día cuando llegan datos nuevos).
  const [picked, setPicked] = useState<number | null>(null);
  const index = picked ?? weeks.length - 1;
  const selected = weeks[index];
  const insight = selected ? insights.find((i) => i.cycleNumber === selected.cycleNumber && i.week === selected.week) : undefined;

  const go = (next: number) => setPicked(next >= weeks.length - 1 ? null : next);

  return (
    <li className="admin__card">
      <div className="admin-team__head">
        <h2 className="admin-team__name">{team.name}</h2>
        <span className="admin-team__meta">
          {status ? `En curso: ciclo ${status.number} · semana ${status.week} de 3` : "Sin ciclo en curso"}
        </span>
      </div>

      {!selected ? (
        <p className="admin__caption">Las semanas aparecerán aquí cuando el equipo empiece su primer ciclo.</p>
      ) : (
        <>
          {/* Selector de semana: ‹ Ciclo 1 · Semana 2 › */}
          <div className="admin-weeknav">
            <button
              type="button"
              className="admin-weeknav__arrow"
              aria-label="Semana anterior"
              disabled={index <= 0}
              onClick={() => go(index - 1)}
            >
              ‹
            </button>
            <div className="admin-weeknav__label" aria-live="polite">
              <strong>
                Ciclo {selected.cycleNumber} · Semana {selected.week}
              </strong>
              <span>
                {weekRange(selected)}
                {selected.current ? " · en curso" : ""}
              </span>
            </div>
            <button
              type="button"
              className="admin-weeknav__arrow"
              aria-label="Semana siguiente"
              disabled={index >= weeks.length - 1}
              onClick={() => go(index + 1)}
            >
              ›
            </button>
          </div>

          <div className="admin-week" aria-label="Semanas del ciclo">
            {PHASES.map((phase) => (
              <span
                key={phase.week}
                className={selected.week === phase.week ? "admin-week__step is-current" : "admin-week__step"}
                aria-current={selected.week === phase.week ? "step" : undefined}
              >
                <strong>Sem. {phase.week}</strong>
                {phase.label}
              </span>
            ))}
          </div>

          <WeekTension week={selected} />
          <WeekInsight week={selected} insight={insight} />
        </>
      )}
    </li>
  );
}

function WeekTension({ week }: { week: TeamWeek }) {
  return (
    <div className="admin-tension">
      <h3 className="pattern__title pattern__title--teal">Temas que generaron tensión</h3>
      {week.tension.length === 0 ? (
        <p className="admin__caption">
          {week.respondents < 3
            ? `Respondieron ${week.respondents} ${week.respondents === 1 ? "persona" : "personas"}: se muestra con al menos 3.`
            : "Sin registros de tensión esta semana."}
        </p>
      ) : (
        <ul className="pattern__rows">
          {week.tension.map((row) => (
            <li key={row.label} className="pattern__row pattern__row--wide">
              <span className="pattern__label pattern__label--teal">{row.label}</span>
              <span className="pattern__track pattern__track--gray">
                <span className="pattern__fill pattern__fill--teal" style={{ width: `${row.value * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WeekInsight({ week, insight }: { week: TeamWeek; insight: TeamInsight | undefined }) {
  const daysLeft = Math.max(1, Math.ceil((Date.parse(week.endsAt) - Date.now()) / MS_PER_DAY));
  return (
    <div className="admin-insight">
      <h3 className="pattern__title pattern__title--teal">Lectura de la semana</h3>
      {insight ? (
        <InsightBody insight={insight} />
      ) : (
        <p className="admin__caption">
          {week.current
            ? `Se escribe al terminar la semana, en ${days(daysLeft)}.`
            : "Esta semana no tiene lectura (el equipo no abrió la app cuando terminó, o es anterior a la IA)."}
        </p>
      )}
    </div>
  );
}
