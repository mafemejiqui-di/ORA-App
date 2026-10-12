import createdEllipseTop from "../assets/decor/created-ellipse-top.svg";
import createdGroupBottom from "../assets/decor/created-group-bottom.svg";
import createdGroupRight from "../assets/decor/created-group-right.svg";
import linkedGroup from "../assets/decor/linked-group.svg";
import "./CircleBackdrop.css";

type CircleBackdropProps = {
  /**
   * "split": fondo de "Cuenta creada" (tres piezas) · "full": el de "Cuenta enlazada"
   * (una sola) · "corners": cuatro anillos en las esquinas (introducción y cierre del Tótem).
   */
  variant?: "split" | "full" | "corners";
};

const TEAL = { stroke: "#158497", opacity: 0.2 };
const BURGUNDY = { stroke: "#73171A", opacity: 0.5 };
const RING_WIDTH = 22;

/**
 * Círculos decorativos de fondo (teal y burdeos). Se coloca dentro de un contenedor
 * con position: relative y overflow: hidden; el contenido que va encima necesita
 * position: relative y z-index: 1.
 */
export function CircleBackdrop({ variant = "split" }: CircleBackdropProps) {
  if (variant === "corners") {
    // Los anillos de arriba se anclan al borde superior y los de abajo al inferior,
    // así la composición se mantiene aunque cambie la altura de la pantalla.
    return (
      <div className="circle-backdrop" aria-hidden="true">
        <svg
          className="circle-backdrop__corner circle-backdrop__corner--top"
          width="393"
          height="260"
          viewBox="0 0 393 260"
          fill="none"
        >
          <circle cx="25" cy="70" r="160" strokeWidth={RING_WIDTH} stroke={TEAL.stroke} strokeOpacity={TEAL.opacity} />
          <circle
            cx="372"
            cy="88"
            r="148"
            strokeWidth={RING_WIDTH}
            stroke={BURGUNDY.stroke}
            strokeOpacity={BURGUNDY.opacity}
          />
        </svg>
        <svg
          className="circle-backdrop__corner circle-backdrop__corner--bottom"
          width="393"
          height="430"
          viewBox="0 0 393 430"
          fill="none"
        >
          <circle cx="468" cy="253" r="184" strokeWidth={RING_WIDTH} stroke={TEAL.stroke} strokeOpacity={TEAL.opacity} />
          <circle
            cx="81"
            cy="418"
            r="174"
            strokeWidth={RING_WIDTH}
            stroke={BURGUNDY.stroke}
            strokeOpacity={BURGUNDY.opacity}
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="circle-backdrop" aria-hidden="true">
      {variant === "full" ? (
        <img className="circle-backdrop__full" src={linkedGroup} width={633} height={1012} alt="" />
      ) : (
        <>
          <img className="circle-backdrop__bottom" src={createdGroupBottom} width={633} height={394} alt="" />
          <img className="circle-backdrop__right" src={createdGroupRight} width={358} height={367} alt="" />
          <img className="circle-backdrop__top" src={createdEllipseTop} width={331} height={340} alt="" />
        </>
      )}
    </div>
  );
}
