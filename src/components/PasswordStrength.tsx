import { passwordScore } from "../utils/validation";
import "./PasswordStrength.css";

export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  const tone = score >= 3 ? "is-strong" : "is-weak";

  return (
    <div className="strength" role="img" aria-label={`Fuerza de la contraseña: ${score} de 4`}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={i < score ? `strength__bar ${tone}` : "strength__bar"} />
      ))}
    </div>
  );
}
