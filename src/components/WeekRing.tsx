import type { CSSProperties } from "react";
import "./WeekRing.css";

export type RingWeek = {
  /** Color del módulo que se trabaja esa semana. */
  color: string;
  /** false: semana pendiente (solo contorno). */
  filled: boolean;
};

type WeekRingProps = {
  weeks: RingWeek[];
  centerValue: string;
  label: string;
  /** Círculos pequeños (p. ej. uno por día). */
  compact?: boolean;
};

/** Ciclo como anillo de círculos (uno por semana o por día) que "respiran" en secuencia. */
export function WeekRing({ weeks, centerValue, label, compact = false }: WeekRingProps) {
  const step = 360 / weeks.length;
  return (
    <div className={compact ? "week-ring week-ring--compact" : "week-ring"} role="img" aria-label={label} style={{ "--week-count": weeks.length } as CSSProperties}>
      {weeks.map((week, index) => (
        <span
          key={index}
          className="week-ring__slot"
          style={{ "--angle": `${index * step}deg`, "--index": index } as CSSProperties}
        >
          <span
            className={week.filled ? "week-ring__dot" : "week-ring__dot is-pending"}
            style={week.filled ? { background: week.color } : undefined}
          />
        </span>
      ))}
      <span className="week-ring__value">{centerValue}</span>
    </div>
  );
}
