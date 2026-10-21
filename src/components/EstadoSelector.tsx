import type { EstadoOption } from "../data/ritual";
import { FaceIcon } from "./FaceIcon";
import "./EstadoSelector.css";

type EstadoSelectorProps = {
  options: readonly EstadoOption[];
  value: string | null;
  onChange: (next: string | null) => void;
  /** id del título que describe el grupo. */
  labelledBy: string;
  /** Solo muestra la selección, sin permitir cambiarla. */
  readOnly?: boolean;
};

/** Fila de tarjetas con emoji para elegir cómo llegas hoy (una sola opción). */
export function EstadoSelector({ options, value, onChange, labelledBy, readOnly = false }: EstadoSelectorProps) {
  return (
    <div className={readOnly ? "estado is-readonly" : "estado"} role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((option) => {
        const selected = value === option.label;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={selected}
            className={selected ? "estado__card is-selected" : "estado__card"}
            disabled={readOnly}
            onClick={() => onChange(selected ? null : option.label)}
          >
            {option.face ? (
              <span className="estado__face">
                <FaceIcon name={option.face} />
              </span>
            ) : (
              <span className="estado__emoji" aria-hidden="true">
                {option.emoji}
              </span>
            )}
            <span className="estado__label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
