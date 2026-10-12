import { useState } from "react";
import type { UsageDay } from "../../utils/teamInsights";
import "./UsageChart.css";

const WEEKDAY_INITIAL = ["D", "L", "M", "X", "J", "V", "S"];
const WEEKDAY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const dayLabel = (date: Date) => `${WEEKDAY[date.getDay()]} ${date.getDate()} ${MONTH[date.getMonth()]}`;

/** "Gen Z (Agotado) vs. Boomers (Enfocado)": quién llegó peor y quién mejor ese día. */
function differenceText(day: UsageDay) {
  const { difference } = day;
  if (!difference) return "Sin diferencias marcadas";
  return `${difference.low.who} (${difference.low.estado}) vs. ${difference.high.who} (${difference.high.estado})`;
}

/**
 * Dos lecturas sobre los mismos días (sin doble eje):
 * arriba, el % del equipo que usó la app; abajo, cuánto se diferenciaron los integrantes entre sí.
 */
export function UsageChart({ days }: { days: UsageDay[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  // La escala va del día con menos diferencias (claro) al de más (oscuro).
  const minSpread = Math.min(...days.map((d) => d.spread));
  const spreadRange = Math.max(Math.max(...days.map((d) => d.spread)) - minSpread, 0.01);
  const flagged = days.filter((d) => d.flagged);
  const current = hovered === null ? null : days[hovered];

  return (
    <div className="usage">
      <div className="usage__plot" onPointerLeave={() => setHovered(null)}>
        {/* Rejilla recesiva: 0, 50 y 100 %. */}
        <div className="usage__grid" aria-hidden="true">
          <span className="usage__gridline" style={{ bottom: "100%" }}>
            <span className="usage__gridlabel">100%</span>
          </span>
          <span className="usage__gridline" style={{ bottom: "50%" }}>
            <span className="usage__gridlabel">50%</span>
          </span>
          <span className="usage__gridline usage__gridline--base" style={{ bottom: 0 }} />
        </div>

        <div className="usage__columns">
          {days.map((day, index) => (
            <button
              key={day.iso}
              type="button"
              className={hovered === index ? "usage__column is-hovered" : "usage__column"}
              aria-label={`${dayLabel(day.date)}: ${day.percent}% del equipo usó la app (${day.active} de ${day.total}). ${differenceText(day)}${day.flagged ? ", uno de los días con más diferencias" : ""}.`}
              onPointerEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
            >
              <span className="usage__bar" style={{ height: `${Math.max(day.percent, 2)}%` }} />
            </button>
          ))}
        </div>

        {current && (
          <div
            className="usage__tooltip"
            role="status"
            style={{ left: `${((hovered! + 0.5) / days.length) * 100}%` }}
          >
            <span className="usage__tooltip-value">{current.percent}% activos</span>
            <span className="usage__tooltip-row">
              {current.active} de {current.total} integrantes
            </span>
            <span className="usage__tooltip-row usage__tooltip-row--difference">
              <span className="usage__key usage__key--spread" /> {differenceText(current)}
            </span>
            <span className="usage__tooltip-date">{dayLabel(current.date)}</span>
          </div>
        )}
      </div>

      {/* Diferencias entre integrantes: un tono, de claro (poca) a oscuro (mucha). */}
      <div className="usage__strip" aria-hidden="true">
        {days.map((day, index) => (
          <span
            key={day.iso}
            className={[
              "usage__cell",
              day.flagged ? "is-flagged" : "",
              hovered === index ? "is-hovered" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ opacity: 0.15 + 0.85 * ((day.spread - minSpread) / spreadRange) }}
            onPointerEnter={() => setHovered(index)}
          />
        ))}
      </div>
      <div className="usage__flags" aria-hidden="true">
        {days.map((day) => (
          <span key={day.iso} className="usage__flag">
            {day.flagged ? "▲" : ""}
          </span>
        ))}
      </div>

      <div className="usage__axis" aria-hidden="true">
        {days.map((day, index) => (
          <span key={day.iso} className={index === days.length - 1 ? "usage__tick is-today" : "usage__tick"}>
            {WEEKDAY_INITIAL[day.date.getDay()]}
          </span>
        ))}
      </div>

      <div className="usage__legend">
        <span className="usage__legend-item">
          <span className="usage__key usage__key--bar" /> % del equipo que usó la app
        </span>
        <span className="usage__legend-item">
          <span className="usage__key usage__key--spread" /> Diferencia entre integrantes (más oscuro, más marcada)
        </span>
      </div>

      {flagged.length > 0 && (
        <div className="usage__note">
          <strong>▲ Días con la diferencia más marcada</strong>
          <ul className="usage__note-list">
            {flagged.map((day) => (
              <li key={day.iso}>
                <span className="usage__note-day">{dayLabel(day.date)}:</span> {differenceText(day)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vista de tabla para lectores de pantalla. */}
      <table className="sr-only">
        <caption>Uso diario de la app y diferencias entre integrantes</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Uso</th>
            <th scope="col">Diferencia más marcada</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.iso}>
              <th scope="row">{dayLabel(day.date)}</th>
              <td>
                {day.percent}% ({day.active} de {day.total})
              </td>
              <td>
                {differenceText(day)}
                {day.flagged ? " (de las más marcadas)" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
