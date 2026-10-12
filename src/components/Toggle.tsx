import "./Toggle.css";

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Nombre accesible del interruptor. */
  label: string;
};

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={checked ? "toggle is-on" : "toggle"}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__knob" />
    </button>
  );
}
