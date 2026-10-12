import "./FillingTotem.css";

// Triángulo del Tótem (el mismo trazo de Figma, en un lienzo de 64 px).
const TRIANGLE = "M32 6L56 52H8L32 6Z";

type FillingTotemProps = {
  size?: number;
};

/**
 * Triángulo del Tótem que se rellena de abajo hacia arriba al montarse: el contorno
 * queda fijo y el relleno burdeos sube hasta la punta. Con "reducir movimiento"
 * aparece ya lleno.
 */
export function FillingTotem({ size = 64 }: FillingTotemProps) {
  return (
    <span className="filling-totem" style={{ width: size, height: size }} aria-hidden="true">
      <svg className="filling-totem__outline" width={size} height={size} viewBox="0 0 64 64" fill="none">
        <path d={TRIANGLE} stroke="var(--color-brand-dark)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <svg className="filling-totem__fill" width={size} height={size} viewBox="0 0 64 64" fill="none">
        <path d={TRIANGLE} fill="var(--color-brand-dark)" stroke="var(--color-brand-dark)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
