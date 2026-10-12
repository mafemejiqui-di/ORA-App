import { useEffect, useState } from "react";
import letterA from "../assets/splash/ora-a.png";
import letterO from "../assets/splash/ora-o.png";
import letterR from "../assets/splash/ora-r.png";
import "./Splash.css";

/** Duración total de la animación (ms); debe coincidir con Splash.css. */
const DURATION_MS = 2950;
const REDUCED_MS = 1000;

/**
 * Pantalla de bienvenida al abrir la app: las letras de ORA aparecen, se recogen en la O
 * (el anillo del ícono), aparece el punto azul y ese punto se abre para mostrar la app.
 * Tocarla la salta.
 */
export function Splash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // El fondo vino que pinta index.html mientras carga la app ya no hace falta.
    document.getElementById("boot-splash")?.remove();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setVisible(false), reduced ? REDUCED_MS : DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash" aria-hidden="true" onClick={() => setVisible(false)}>
      <img className="splash__letter splash__letter--o" src={letterO} alt="" />
      <img className="splash__letter splash__letter--r" src={letterR} alt="" />
      <img className="splash__letter splash__letter--a" src={letterA} alt="" />
      <span className="splash__dot" />
    </div>
  );
}
