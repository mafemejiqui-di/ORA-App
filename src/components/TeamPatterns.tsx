import type { TeamDashboard } from "../data/api";
import { getGeneration } from "../data/catalogs";
import "./TeamPatterns.css";

/** ¿Hay algo que mostrar en los patrones del equipo? */
export function hasPatterns(dashboard: TeamDashboard | null | undefined) {
  return Boolean(dashboard && (dashboard.friction.length > 0 || dashboard.tension.length > 0));
}

/**
 * Tarjetas "Fricción más frecuente" y "Tensión más registrada" (Equipo y vista de administradora),
 * calculadas por la base de datos con las respuestas del ciclo en curso. Solo aparecen los grupos
 * con respuestas suficientes (privacidad).
 */
export function TeamPatterns({ dashboard }: { dashboard: TeamDashboard }) {
  const { friction, tension, minGroup } = dashboard;
  const max = Math.max(0, ...friction.map((row) => row.value));
  const top = friction.find((row) => row.value === max && max > 0);

  return (
    <>
      <div className="pattern pattern--friction">
        <h3 className="pattern__title pattern__title--brown">Fricción más frecuente</h3>
        {friction.length === 0 ? (
          <p className="pattern__empty">Se muestra cuando al menos {minGroup} personas de una generación respondan "Ver cómo estamos".</p>
        ) : (
          <ul className="pattern__rows">
            {friction.map((row) => (
              <li key={row.generation} className="pattern__row">
                <span className="pattern__label pattern__label--muted">{getGeneration(row.generation)?.short}</span>
                <span className="pattern__track pattern__track--gray">
                  <span className="pattern__fill pattern__fill--brown" style={{ width: `${max > 0 ? (row.value / max) * 100 : 0}%` }} />
                </span>
                <span className="pattern__value">{row === top ? `${row.share}%` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pattern pattern--tension">
        <h3 className="pattern__title pattern__title--teal">Tensión más registrada</h3>
        {tension.length === 0 ? (
          <p className="pattern__empty">Se muestra cuando al menos {minGroup} personas registren respuestas en este ciclo.</p>
        ) : (
          <ul className="pattern__rows">
            {tension.map((row) => (
              <li key={row.label} className="pattern__row pattern__row--wide">
                <span className="pattern__label pattern__label--teal">{row.label}</span>
                <span className="pattern__track pattern__track--white">
                  <span className="pattern__fill pattern__fill--teal" style={{ width: `${row.value * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
