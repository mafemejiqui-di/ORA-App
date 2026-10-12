import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import arrowRight from "../../../assets/icons/arrow-right.svg";
import lockIcon from "../../../assets/icons/lock.svg";
import { useAuth } from "../../../state/AuthContext";
import { days, getCycleStatus, getCycleKey } from "../../../utils/cycle";
import "./ModuleCarousel.css";

type ModuleConfig = {
  id: string;
  eyebrow: string;
  title: string;
  to: string;
  /** Sin valor = disponible. */
  lock?: { pill: string; footer: string };
  /** Texto del estado cuando está disponible (por defecto "Disponible"). */
  status?: string;
  /** Ya no se puede agregar información (se respondió o pasó su semana), pero se pueden ver las respuestas. */
  closed?: boolean;
  /** Tarjeta que queda centrada al abrir el carrusel: la de la semana en curso. */
  featured?: boolean;
};

/**
 * Carrusel de módulos del ciclo. Los ciclos son automáticos: semana 1 "Ver cómo estamos",
 * semana 2 "Tomar una decisión" (abierto siempre) y semana 3 "Cerrar el ciclo".
 */
export function ModuleCarousel() {
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const [center, setCenter] = useState(0);
  const { user, team } = useAuth();
  const cycle = getCycleStatus(team);
  const key = getCycleKey(team);
  const diagnosisDone = Boolean(user?.diagnoses?.[key]);
  const closingDone = Boolean(user?.closings?.[key]);

  const noTeam = { pill: "Sin equipo", footer: "Únete a un equipo para empezar tu ciclo" };
  const modules: ModuleConfig[] = [
    {
      id: "diagnosis",
      eyebrow: "Semana 1 · Inicio de ciclo",
      title: "Ver cómo estamos",
      to: "/ciclo/diagnostico",
      featured: cycle?.week === 1,
      status: diagnosisDone ? "Respondido" : undefined,
      // Una respuesta por ciclo y solo en la semana 1: respondido o vencido, queda con candado.
      closed: Boolean(cycle) && (diagnosisDone || !cycle?.diagnosisOpen),
      lock: !cycle
        ? noTeam
        : cycle.diagnosisOpen || diagnosisDone
          ? undefined
          : { pill: "Cerrado", footer: `Vuelve a abrirse con el próximo ciclo, en ${days(cycle.daysLeft)}` },
    },
    {
      id: "decision",
      eyebrow: "Semana 2 · Uso puntual",
      title: "Tomar una decisión",
      to: "/decision",
      featured: cycle?.week === 2,
      status: cycle?.week === 2 ? "Esta semana" : undefined,
      lock: cycle ? undefined : noTeam,
    },
    {
      id: "closing",
      eyebrow: "Semana 3 · Cierre de ciclo",
      title: "Cerrar el ciclo",
      to: "/ciclo/cierre",
      featured: cycle?.week === 3,
      status: closingDone ? "Respondido" : undefined,
      closed: closingDone,
      lock: !cycle
        ? noTeam
        : cycle.closingOpen || closingDone
          ? undefined
          : { pill: `En ${days(cycle.daysUntilClosing)}`, footer: `Se abre en la semana 3, en ${days(cycle.daysUntilClosing)}` },
    },
  ];
  if (!modules.some((m) => m.featured)) modules[0].featured = true;

  useEffect(() => {
    const el = scroller.current;
    const target = el?.querySelector<HTMLElement>("[data-featured]");
    if (el && target) el.scrollLeft = target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2;
  }, []);

  // La tarjeta más cerca del centro del carrusel es la protagonista (vino); las demás quedan atrás.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      const middle = el.scrollLeft + el.clientWidth / 2;
      const cards = [...el.children] as HTMLElement[];
      const distances = cards.map((card) => Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle));
      setCenter(distances.indexOf(Math.min(...distances)));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  function scrollToCard(card: HTMLElement) {
    const el = scroller.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <div className="carousel" ref={scroller} role="region" aria-label="Módulos del ciclo" tabIndex={0}>
      {modules.map((module, index) => {
        const featured = module.featured ? { "data-featured": "" } : {};
        const position = index === center ? "is-center" : index < center ? "is-left" : "is-right";
        const isCenter = index === center;

        return (
          <button
            key={module.id}
            type="button"
            className={`module ${position}${module.lock ? " is-locked" : ""}`}
            aria-disabled={module.lock ? true : undefined}
            // Tocar una tarjeta de atrás la trae al centro; la del centro abre el módulo si está disponible.
            onClick={(event) => {
              if (!isCenter) scrollToCard(event.currentTarget);
              else if (!module.lock) navigate(module.to);
            }}
            {...featured}
          >
            <span className="module__row">
              <span className="module__eyebrow">{module.eyebrow}</span>
              <span className="module__status">
                {/* Candado: ya no se puede agregar información en este módulo. */}
                {(module.lock || module.closed) && (
                  <img className="module__icon module__status-lock" src={lockIcon} width={10} height={10} alt="" />
                )}
                {module.lock ? module.lock.pill : (module.status ?? "Disponible")}
              </span>
            </span>
            <span className="module__body">
              <span className="module__title">{module.title}</span>
              <span className="module__divider" />
            </span>
            {module.lock ? (
              <span className="module__footer">
                <img className="module__icon" src={lockIcon} width={12} height={12} alt="" />
                <span className="module__footer-text">{module.lock.footer}</span>
              </span>
            ) : module.closed ? (
              <span className="module__footer">
                <img className="module__icon" src={lockIcon} width={12} height={12} alt="" />
                <span className="module__footer-text">Cerrado · toca para ver tus respuestas</span>
              </span>
            ) : (
              <span className="module__row">
                <span className="module__cta">Abrir ahora</span>
                <img className="module__icon" src={arrowRight} width={14} height={14} alt="" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
