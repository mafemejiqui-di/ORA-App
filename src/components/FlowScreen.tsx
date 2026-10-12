import type { ReactNode } from "react";
import { BackChevron } from "./BackChevron";
import "./FlowScreen.css";

type FlowScreenProps = {
  title: string;
  subtitle: string;
  onBack: () => void;
  /** Texto pequeño a la derecha del chevron (p. ej. "Sem. 1 de 3"). */
  meta?: string;
  footer: ReactNode;
  children: ReactNode;
};

/** Pantalla de preguntas de los módulos del ciclo: encabezado fijo, preguntas con scroll y botón abajo. */
export function FlowScreen({ title, subtitle, onBack, meta, footer, children }: FlowScreenProps) {
  return (
    <main className="flow">
      <header className="flow__header">
        <div className="flow__nav">
          <BackChevron onClick={onBack} />
          {meta && <span className="flow__meta">{meta}</span>}
        </div>
        <h1 className="flow__title">{title}</h1>
        <p className="flow__sub">{subtitle}</p>
      </header>
      <div className="flow__scroll">{children}</div>
      <footer className="flow__footer">{footer}</footer>
    </main>
  );
}

type FlowQuestionProps = {
  id: string;
  question: string;
  hint: string;
  children: ReactNode;
};

/** Una pregunta con su ayuda; `id` titula el grupo de opciones (aria-labelledby). */
export function FlowQuestion({ id, question, hint, children }: FlowQuestionProps) {
  return (
    <section className="flow__block" aria-labelledby={id}>
      <h2 className="flow__question" id={id}>
        {question}
      </h2>
      <p className="flow__hint">{hint}</p>
      {children}
    </section>
  );
}
