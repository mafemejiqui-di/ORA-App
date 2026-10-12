import { useId, useState, type ReactNode } from "react";

type TeamAccordionProps = {
  title: string;
  summary: string;
  /** Contenido que se despliega al tocar el equipo. */
  children: ReactNode;
  defaultOpen?: boolean;
};

/** Tarjeta de equipo que se despliega al tocarla (Ciclo y Equipo de la administradora). */
export function TeamAccordion({ title, summary, children, defaultOpen = false }: TeamAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <li className="admin__card">
      <button
        type="button"
        className="admin-accordion__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="admin-accordion__text">
          <span className="admin-team__name">{title}</span>
          <span className="admin-member__role">{summary}</span>
        </span>
        <span className="admin-accordion__chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="admin-accordion__panel" id={panelId}>
          {children}
        </div>
      )}
    </li>
  );
}
