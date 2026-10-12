import { getInitials } from "../utils/format";
import "./Avatar.css";

type AvatarProps = {
  name: string;
  size?: "md" | "lg";
  className?: string;
};

/** Círculo con las iniciales de la persona. El nombre completo va en el texto de al lado. */
export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span className={["avatar", `avatar--${size}`, className].filter(Boolean).join(" ")} aria-hidden="true">
      {getInitials(name)}
    </span>
  );
}
