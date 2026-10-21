// Expresiones para elegir cómo llega la persona (Ritual diario y "Ver cómo estamos").
// Se dibujan con el color del texto (currentColor): vinotinto sin seleccionar, crema seleccionada.

export type FaceName = "tired" | "neutral" | "smile" | "grin" | "happy";

const STROKE = { stroke: "currentColor", strokeWidth: 2.7, strokeLinecap: "round" as const, fill: "none" };

/** Ojos abiertos (dos puntos). */
const DotEyes = () => (
  <>
    <circle cx="11" cy="13" r="2.1" fill="currentColor" />
    <circle cx="21" cy="13" r="2.1" fill="currentColor" />
  </>
);

/** Boca abierta sonriente (media luna rellena). */
const OpenSmile = () => <path d="M9.5 18.5h13c0 3.7-2.9 6.6-6.5 6.6s-6.5-2.9-6.5-6.6z" fill="currentColor" />;

const FACES: Record<FaceName, () => JSX.Element> = {
  // Agotado: ojos cerrados y boca caída.
  tired: () => (
    <>
      <path d="M7.5 12.5q3 2.6 6 0M18.5 12.5q3 2.6 6 0" {...STROKE} />
      <path d="M10 24q6-6.5 12 0q-6-2.2-12 0z" fill="currentColor" />
    </>
  ),
  // Neutro: boca recta.
  neutral: () => (
    <>
      <DotEyes />
      <path d="M11 21.5h10" {...STROKE} />
    </>
  ),
  // Estable: sonrisa leve.
  smile: () => (
    <>
      <DotEyes />
      <path d="M10.5 19.5q5.5 5 11 0" {...STROKE} />
    </>
  ),
  // Activo: sonrisa abierta.
  grin: () => (
    <>
      <DotEyes />
      <OpenSmile />
    </>
  ),
  // Enfocado: ojos felices cerrados y sonrisa abierta.
  happy: () => (
    <>
      <path d="M7.5 14q3-3.2 6 0M18.5 14q3-3.2 6 0" {...STROKE} />
      <OpenSmile />
    </>
  ),
};

export function FaceIcon({ name, size = 38 }: { name: FaceName; size?: number }) {
  const Face = FACES[name];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <Face />
    </svg>
  );
}
