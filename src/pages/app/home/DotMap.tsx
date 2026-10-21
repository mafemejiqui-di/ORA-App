import { useState, type CSSProperties } from "react";
import chevronUp from "../../../assets/icons/chevron-up.svg";
import type { CycleModule, TeamDashboard } from "../../../data/api";
import { DOT_MAP_COLUMNS, type TensionLevel } from "../../../data/teamData";
import { MODULE_WEEK } from "../../../utils/cycle";
import "./DotMap.css";

const LEVEL_LABEL: Record<TensionLevel, string> = {
  none: "Sin datos",
  low: "Tensión baja",
  medium: "Tensión media",
  high: "Alta tensión",
};

const ROWS: { module: CycleModule; label: string }[] = [
  { module: "diagnosis", label: "Ver cómo estamos" },
  { module: "decision", label: "Tomar una decisión" },
  { module: "closing", label: "Cerrar el ciclo" },
];

/** Cortes aprobados: menos de 0.25 baja, hasta 0.5 media, más de 0.5 alta. */
function levelOf(value: number | undefined): TensionLevel {
  if (value === undefined) return "none";
  if (value > 0.5) return "high";
  if (value >= 0.25) return "medium";
  return "low";
}

// Desfase negativo: cada círculo arranca ya a mitad de su respiración y no laten todos a la vez.
const BREATH_STAGGER_SECONDS = 0.43;

/**
 * Mapa de puntos: tensión por generación en cada módulo del ciclo en curso. Lo calcula la base
 * de datos con las respuestas del equipo (cada generación desde 1 persona) y se actualiza en vivo.
 */
export function DotMap({ dashboard }: { dashboard: TeamDashboard | null }) {
  const [expanded, setExpanded] = useState(true);
  const week = dashboard?.cycle.week ?? 0;
  const hasData = Boolean(dashboard && Object.keys(dashboard.dotmap).length > 0);

  return (
    <section className="dotmap" aria-labelledby="dotmap-title">
      <div className="dotmap__header">
        <h2 className="dotmap__title" id="dotmap-title">
          Patrones del equipo
        </h2>
        <button
          type="button"
          className="dotmap__toggle"
          aria-expanded={expanded}
          aria-controls="dotmap-body"
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="dotmap__badge">{dashboard ? `Ciclo ${dashboard.cycle.number}` : "Sin equipo"}</span>
          <img
            className={expanded ? "dotmap__chevron" : "dotmap__chevron is-collapsed"}
            src={chevronUp}
            width={14}
            height={14}
            alt=""
          />
        </button>
      </div>

      <div id="dotmap-body" hidden={!expanded}>
        <div className="dotmap__columns" aria-hidden="true">
          {DOT_MAP_COLUMNS.map((column) => (
            <span key={column.id} className="dotmap__column">
              {column.label}
            </span>
          ))}
        </div>

        <div className="dotmap__rows">
          {ROWS.map((row, rowIndex) => {
            // Un módulo cuya semana aún no llega se ve en espera.
            const pending = week < MODULE_WEEK[row.module];
            const cells = dashboard?.dotmap[row.module] ?? {};
            return (
              <div key={row.module} className={pending ? "dotmap__row is-pending" : "dotmap__row"}>
                <span className="dotmap__row-label">{row.label}</span>
                {DOT_MAP_COLUMNS.map((column, index) => {
                  const level = levelOf(cells[column.id]);
                  return (
                    <span key={column.id} className="dotmap__cell">
                      <span
                        className={`dot dot--${level}`}
                        style={
                          {
                            "--breath-delay": `${-(rowIndex * DOT_MAP_COLUMNS.length + index) * BREATH_STAGGER_SECONDS}s`,
                          } as CSSProperties
                        }
                        role="img"
                        aria-label={`${row.label}, ${column.label}: ${LEVEL_LABEL[level]}`}
                      />
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>

        {!hasData && (
          <p className="dotmap__note">
            {dashboard
              ? "Los puntos se llenan a medida que el equipo responde los módulos del ciclo."
              : "Únete a un equipo para ver sus patrones."}
          </p>
        )}

        <ul className="dotmap__legend">
          <li>
            <span className="dot dot--legend-high" /> Alta
          </li>
          <li>
            <span className="dot dot--legend-medium" /> Media
          </li>
          <li>
            <span className="dot dot--legend-low" /> Baja
          </li>
          <li>
            <span className="dot dot--legend-none" /> Sin datos
          </li>
        </ul>
      </div>
    </section>
  );
}
