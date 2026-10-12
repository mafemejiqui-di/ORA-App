import "./Toggle.css";

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Nombre accesible del interruptor. */
  label: string;
  /** Mientras se procesa un cambio (p. ej. pidiendo permiso de notificaciones). */
  disabled?: boolean;
};

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={checked ? "toggle is-on" : "toggle"}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__knob" />
    </button>
  );
}
