import type { FormEventHandler, ReactNode } from "react";
import arrowLeft from "../assets/icons/arrow-left.svg";
import { BackChevron } from "./BackChevron";
import "./OnboardingLayout.css";

type OnboardingLayoutProps = {
  /** Sin esto no se muestra el botón de volver (p. ej. la pantalla final del Tótem). */
  onBack?: () => void;
  /** "arrow": flecha burdeos del registro · "chevron": chevron azul del botón principal. */
  backIcon?: "arrow" | "chevron";
  /** Contador "N de M" en la esquina superior derecha. */
  step?: { current: number; total: number };
  children: ReactNode;
  footer: ReactNode;
  /** Pie fijo con línea superior (registro) o pie sin borde al final del flujo (login). */
  footerVariant?: "bar" | "plain";
  /** Clase extra en la raíz para ajustes de una sección (p. ej. "totem"). */
  className?: string;
  /** Si se pasa, toda la pantalla es un <form> y Enter envía. */
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

export function OnboardingLayout({
  onBack,
  backIcon = "arrow",
  step,
  children,
  footer,
  footerVariant = "bar",
  className,
  onSubmit,
}: OnboardingLayoutProps) {
  const rootClass = ["onboarding", className].filter(Boolean).join(" ");

  const body = (
    <>
      <header className="onboarding__header">
        {onBack &&
          (backIcon === "chevron" ? (
            <BackChevron className="onboarding__back-chevron" onClick={onBack} />
          ) : (
            <button type="button" className="onboarding__back" aria-label="Volver" onClick={onBack}>
              <img src={arrowLeft} width={24} height={24} alt="" />
            </button>
          ))}
        {step && (
          <span className="onboarding__step">
            {step.current} de {step.total}
          </span>
        )}
      </header>
      <div className="onboarding__content">{children}</div>
      <footer className={`onboarding__footer onboarding__footer--${footerVariant}`}>{footer}</footer>
    </>
  );

  return onSubmit ? (
    <form className={rootClass} onSubmit={onSubmit} noValidate>
      {body}
    </form>
  ) : (
    <div className={rootClass}>{body}</div>
  );
}
