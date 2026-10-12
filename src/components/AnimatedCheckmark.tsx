import "./AnimatedCheckmark.css";

type AnimatedCheckmarkProps = {
  /** Color del círculo (el check siempre es blanco). */
  color?: string;
  size?: number;
};

/**
 * Check de confirmación animado: se dibuja el aro, se rellena el círculo y al
 * final se traza la marca. Se reproduce al montarse; con "reducir movimiento"
 * se muestra ya terminado.
 */
export function AnimatedCheckmark({ color = "var(--color-brand-dark)", size = 72 }: AnimatedCheckmarkProps) {
  return (
    <svg
      className="checkmark"
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      aria-hidden="true"
      style={{ color }}
    >
      <circle className="checkmark__fill" cx="36" cy="36" r="33" fill="currentColor" />
      <circle
        className="checkmark__ring"
        cx="36"
        cy="36"
        r="33"
        pathLength="1"
        transform="rotate(-90 36 36)"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 1"
      />
      <path
        className="checkmark__tick"
        d="M20 37L30 47L53 24"
        pathLength="1"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1 1"
      />
    </svg>
  );
}
