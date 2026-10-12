import "./OptionList.css";

type OptionListProps = {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  /** id del título que describe el grupo. */
  labelledBy: string;
  /** Sin valor: una sola respuesta. Con valor: varias, hasta este tope. */
  max?: number;
  readOnly?: boolean;
};

/** Opciones a lo ancho, una debajo de otra ("Ver cómo estamos", "Cierre del ciclo"). */
export function OptionList({ options, value, onChange, labelledBy, max, readOnly = false }: OptionListProps) {
  const multiple = max !== undefined;
  const atMax = multiple && value.length >= max;

  function toggle(option: string) {
    const selected = value.includes(option);
    if (!multiple) onChange(selected ? [] : [option]);
    else onChange(selected ? value.filter((item) => item !== option) : [...value, option]);
  }

  return (
    <div
      className={readOnly ? "option-list is-readonly" : "option-list"}
      role={multiple ? "group" : "radiogroup"}
      aria-labelledby={labelledBy}
    >
      {options.map((option) => {
        const selected = value.includes(option);
        const a11y = multiple ? { "aria-pressed": selected } : { role: "radio" as const, "aria-checked": selected };
        return (
          <button
            key={option}
            type="button"
            {...a11y}
            disabled={readOnly || (atMax && !selected)}
            className={selected ? "option-list__option is-selected" : "option-list__option"}
            onClick={() => toggle(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
