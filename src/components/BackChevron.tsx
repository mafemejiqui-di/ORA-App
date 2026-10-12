import "./BackChevron.css";

type BackChevronProps = {
  onClick: () => void;
  /** Para colocarlo según la pantalla (márgenes o posición). */
  className?: string;
};

/** Botón de volver con chevron azul y área táctil de 40 px. */
export function BackChevron({ onClick, className }: BackChevronProps) {
  return (
    <button
      type="button"
      className={["back-chevron", className].filter(Boolean).join(" ")}
      aria-label="Volver"
      onClick={onClick}
    >
      <svg width="28" height="28" viewBox="0 0 512 512" fill="none" aria-hidden="true">
        <polyline
          points="320,128 192,256 320,384"
          stroke="currentColor"
          strokeWidth="46"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
