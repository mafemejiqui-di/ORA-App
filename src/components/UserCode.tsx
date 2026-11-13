import "./UserCode.css";

type UserCodeProps = {
  code?: string | null;
  size?: "sm" | "md";
};

/** Código único del perfil (ORA-0001). No muestra nada si la base de datos aún no lo trae. */
export function UserCode({ code, size = "sm" }: UserCodeProps) {
  if (!code) return null;
  return (
    <span className={`user-code user-code--${size}`} aria-label={`Código ${code}`}>
      {code}
    </span>
  );
}
