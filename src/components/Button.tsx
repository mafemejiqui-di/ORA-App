import { forwardRef, type ButtonHTMLAttributes } from "react";
import "./Button.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className, type = "button", ...rest },
  ref,
) {
  const classes = ["btn", `btn--${variant}`, className].filter(Boolean).join(" ");
  return <button ref={ref} type={type} className={classes} {...rest} />;
});

/** Enlace de texto subrayado (¿Olvidaste tu contraseña?, Crear una, Omitir por ahora). */
export function TextButton({
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = ["text-button", className].filter(Boolean).join(" ");
  return <button type={type} className={classes} {...rest} />;
}
