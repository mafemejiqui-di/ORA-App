export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Hay texto escrito (los espacios solos no cuentan). */
export const isFilled = (value: string) => value.trim().length > 0;

export const MIN_PASSWORD_LENGTH = 8;

/** Puntaje 0–4 para las cuatro barras de fuerza de contraseña. */
export function passwordScore(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++;
  if (password.length < MIN_PASSWORD_LENGTH) score = Math.min(score, 1);
  return score as 0 | 1 | 2 | 3 | 4;
}

/** Deja el código en mayúsculas y con el guion en la posición XXXX-XXXX. */
export function formatTeamCode(raw: string) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}
