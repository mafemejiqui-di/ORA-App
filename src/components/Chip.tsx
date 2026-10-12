import type { ButtonHTMLAttributes } from "react";
import "./Chip.css";

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "role"> & {
  selected?: boolean;
  /** Selección múltiple (aria-pressed) en vez de opción única (radio). */
  multiple?: boolean;
};

export function Chip({ selected = false, multiple = false, className, type = "button", ...rest }: ChipProps) {
  const classes = ["chip", selected ? "is-selected" : "", className].filter(Boolean).join(" ");
  const a11y = multiple
    ? { "aria-pressed": selected }
    : { role: "radio" as const, "aria-checked": selected };
  return <button type={type} className={classes} {...a11y} {...rest} />;
}
