import type { WeekDot } from "../utils/ritual";
import "./StreakTracker.css";

type StreakTrackerProps = {
  currentStreak: number;
  record: number;
  /** Lunes a domingo. */
  weekDots: WeekDot[];
  /** Anima el punto de hoy (al completar el ritual). */
  popToday?: boolean;
};

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const DOT_TEXT: Record<WeekDot, string> = {
  completed: "completado",
  today: "hoy, pendiente",
  "today-done": "hoy, completado",
  empty: "sin ritual",
};

export function StreakTracker({ currentStreak, record, weekDots, popToday = false }: StreakTrackerProps) {
  return (
    <section className="streak" aria-label="Racha del ritual diario">
      <div className="streak__top">
        <div className="streak__count">
          <span className="streak__number" aria-live="polite">
            {currentStreak}
          </span>
          <span className="streak__unit">{currentStreak === 1 ? "día seguido" : "días seguidos"}</span>
        </div>
        <span className="streak__record">Récord: {record} días</span>
      </div>

      <ul className="streak__dots">
        {weekDots.map((dot, index) => (
          <li
            key={DAY_NAMES[index]}
            className={["streak__dot", `streak__dot--${dot}`, popToday && dot === "today-done" ? "is-pop" : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="sr-only">
              {DAY_NAMES[index]}: {DOT_TEXT[dot]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
