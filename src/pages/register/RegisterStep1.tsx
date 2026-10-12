import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import lockIcon from "../../assets/icons/lock.svg";
import { Button } from "../../components/Button";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { PasswordStrength } from "../../components/PasswordStrength";
import { PasswordField, TextField } from "../../components/TextField";
import { isEmailTaken } from "../../data/api";
import { useRegistration } from "../../state/RegistrationContext";
import { formatTeamCode, isValidEmail, MIN_PASSWORD_LENGTH } from "../../utils/validation";
import "./Register.css";

type Field = "name" | "email" | "password" | "repeat";

export function RegisterStep1() {
  const navigate = useNavigate();
  const { draft, update } = useRegistration();
  const [repeat, setRepeat] = useState(draft.password);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);
  const [searchParams] = useSearchParams();

  // Enlace de invitación (?equipo=XXXX-XXXX): deja el código listo para el paso 3.
  useEffect(() => {
    const invitedCode = searchParams.get("equipo");
    if (invitedCode) update({ teamCode: formatTeamCode(invitedCode) });
  }, [searchParams, update]);

  function clearError(field: Field) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Partial<Record<Field, string>> = {};

    if (draft.name.trim().length < 2) next.name = "Cuéntanos cómo te llaman en el equipo.";
    if (!isValidEmail(draft.email)) next.email = "Escribe un correo válido.";
    if (draft.password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Usa mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (repeat !== draft.password) next.repeat = "Las contraseñas no coinciden.";

    if (!next.email) {
      setBusy(true);
      if (await isEmailTaken(draft.email)) next.email = "Este correo ya tiene una cuenta. Prueba iniciando sesión.";
      setBusy(false);
    }

    setErrors(next);
    if (Object.keys(next).length === 0) navigate("/registro/2");
  }

  return (
    <OnboardingLayout
      step={{ current: 1, total: 3 }}
      onBack={() => navigate("/")}
      onSubmit={handleSubmit}
      footer={
        <Button type="submit" disabled={busy}>
          Continuar
        </Button>
      }
    >
      <p className="onboarding__eyebrow">Sobre ti</p>
      <p className="register__privacy">
        <img src={lockIcon} width={13} height={13} alt="" />
        Esta información es privada. Solo tú la ves.
      </p>

      <div className="register__fields">
        <TextField
          label="Cómo te llaman en el equipo"
          placeholder="¿Cómo te llaman en el equipo?"
          autoComplete="nickname"
          value={draft.name}
          error={errors.name}
          onChange={(e) => {
            update({ name: e.target.value });
            clearError("name");
          }}
        />
        <TextField
          label="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          hint="Usarás este correo para ingresar"
          value={draft.email}
          error={errors.email}
          onChange={(e) => {
            update({ email: e.target.value });
            clearError("email");
          }}
        />
        <div>
          <PasswordField
            label="Contraseña"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={draft.password}
            error={errors.password}
            onChange={(e) => {
              update({ password: e.target.value });
              clearError("password");
            }}
          />
          <PasswordStrength password={draft.password} />
        </div>
        <PasswordField
          label="Repite tu contraseña"
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          value={repeat}
          error={errors.repeat}
          onChange={(e) => {
            setRepeat(e.target.value);
            clearError("repeat");
          }}
        />
      </div>
    </OnboardingLayout>
  );
}
