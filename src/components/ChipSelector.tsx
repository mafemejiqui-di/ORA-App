import { Chip } from "./Chip";
import "./ChipSelector.css";

type ChipSelectorProps = {
  options: readonly string[];
  /** true: varias opciones · false: una sola (volver a tocarla la quita). */
  multiSelect: boolean;
  /** Color de la opción elegida. */
  selectedColor: "primary" | "burgundy";
  value: string[];
  onChange: (next: string[]) => void;
  /** id del título que describe el grupo. */
  labelledBy: string;
  /** Solo muestra la selección, sin permitir cambiarla. */
  readOnly?: boolean;
  /** Con selección múltiple: tope de opciones; al llegar, las demás se deshabilitan. */
  max?: number;
};

/** Grupo de chips reutilizable (ritual, "Ver cómo estamos", "Tomar una decisión"). */
export function ChipSelector({
  options,
  multiSelect,
  selectedColor,
  value,
  onChange,
  labelledBy,
  readOnly = false,
  max,
}: ChipSelectorProps) {
  const atMax = multiSelect && max !== undefined && value.length >= max;

  function toggle(option: string) {
    const isSelected = value.includes(option);
    if (multiSelect) onChange(isSelected ? value.filter((item) => item !== option) : [...value, option]);
    else onChange(isSelected ? [] : [option]);
  }

  return (
    <div
      className={`chip-selector chip-selector--${selectedColor}${readOnly ? " is-readonly" : ""}`}
      role={multiSelect ? "group" : "radiogroup"}
      aria-labelledby={labelledBy}
    >
      {options.map((option) => (
        <Chip
          key={option}
          multiple={multiSelect}
          selected={value.includes(option)}
          disabled={readOnly || (atMax && !value.includes(option))}
          onClick={() => toggle(option)}
        >
          {option}
        </Chip>
      ))}
    </div>
  );
}
