import type { ReactNode } from "react";
import usersIcon from "../assets/icons/users-20.svg";
import { formatTeamCode } from "../utils/validation";
import { TextField } from "./TextField";
import "./TeamCodeCard.css";

type TeamCodeCardProps = {
  value: string;
  onChange: (code: string) => void;
  error?: string | null;
  /** Acción debajo del campo (p. ej. el botón para unirse desde Equipo). */
  children?: ReactNode;
  className?: string;
};

/** Tarjeta "¿Tienes un código de equipo?" del registro y de la pantalla Equipo. */
export function TeamCodeCard({ value, onChange, error, children, className }: TeamCodeCardProps) {
  return (
    <section className={["team-code", className].filter(Boolean).join(" ")} aria-labelledby="team-code-title">
      <div className="team-code__header">
        <img className="team-code__icon" src={usersIcon} width={20} height={20} alt="" />
        <div>
          <h2 className="team-code__title" id="team-code-title">
            ¿Tienes un código de equipo?
          </h2>
          <p className="team-code__hint">Si tu líder ya creó el equipo, ingresa el código que te compartió.</p>
        </div>
      </div>
      <TextField
        className="team-code__input"
        label="Código de equipo"
        placeholder="XXXX-XXXX"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={value}
        error={error}
        onChange={(e) => onChange(formatTeamCode(e.target.value))}
      />
      {children}
    </section>
  );
}
