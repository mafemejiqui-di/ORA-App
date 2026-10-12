import type { ButtonHTMLAttributes } from "react";
import "./SelectCard.css";

type SelectCardProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "role" | "title"> & {
  title: string;
  subtitle: string;
  selected?: boolean;
};

/** Tarjeta de opción única (p. ej. generación en el registro). */
export function SelectCard({ title, subtitle, selected = false, className, type = "button", ...rest }: SelectCardProps) {
  const classes = ["select-card", selected ? "is-selected" : "", className].filter(Boolean).join(" ");
  return (
    <button type={type} role="radio" aria-checked={selected} className={classes} {...rest}>
      <span className="select-card__title">{title}</span>
      <span className="select-card__subtitle">{subtitle}</span>
    </button>
  );
}
