import type { ReactNode } from "react";
import "./Tag.css";

type TagProps = {
  tone?: "teal" | "warm";
  size?: "md" | "sm";
  children: ReactNode;
};

/** Etiqueta de dimensión (PERSONA / EQUIPO / ACCIÓN). */
export function Tag({ tone = "teal", size = "md", children }: TagProps) {
  return <span className={`tag tag--${tone} tag--${size}`}>{children}</span>;
}
