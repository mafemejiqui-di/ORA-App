import type { ReactNode } from "react";
import "./Pill.css";

export type PillTone = "teal" | "teal-deep" | "amber" | "warm" | "indigo" | "peach" | "mint" | "neutral";

type PillProps = {
  tone?: PillTone;
  /** md: 12 px (ciclos) · sm: 11 px (generaciones, estados). */
  size?: "md" | "sm";
  children: ReactNode;
};

/** Etiqueta redondeada de color suave (Energía 4.1, Fricción Gen Z, Millennials...). */
export function Pill({ tone = "teal", size = "md", children }: PillProps) {
  return <span className={`pill pill--${tone} pill--${size}`}>{children}</span>;
}
