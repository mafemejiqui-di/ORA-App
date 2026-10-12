import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, TextButton } from "../../components/Button";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { TeamCodeCard } from "../../components/TeamCodeCard";
import { TextField } from "../../components/TextField";
import { ApiError } from "../../data/api";
import { useAuth } from "../../state/AuthContext";
import { useRegistration } from "../../state/RegistrationContext";
import "./Register.css";

export function RegisterStep3() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { draft, update } = useRegistration();
  const [busy, setBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (!draft.name || !draft.email || !draft.password) {
    return <Navigate to="/registro/1" replace />;
  }

  async function createAccount(skipTeam: boolean) {
    setBusy(true);
    setCodeError(null);
    setFormError(null);
    try {
      await register({
        ...draft,
        orgName: skipTeam ? "" : draft.orgName,
        teamCode: skipTeam ? "" : draft.teamCode,
      });
      navigate("/cuenta-creada", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "team-code-not-found") {
        setCodeError(err.message);
      } else {
        setFormError(err instanceof ApiError ? err.message : "No pudimos crear tu cuenta. Inténtalo de nuevo.");
      }
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void createAccount(false);
  }

  return (
    <OnboardingLayout
      step={{ current: 3, total: 3 }}
      onBack={() => navigate("/registro/2")}
      onSubmit={handleSubmit}
      footer={
        <>
          <Button type="submit" disabled={busy}>
            Crear mi cuenta
          </Button>
          <TextButton className="register__skip" disabled={busy} onClick={() => void createAccount(true)}>
            Omitir por ahora
          </TextButton>
        </>
      }
    >
      <p className="onboarding__eyebrow">Tu equipo</p>
      <p className="onboarding__lead register__lead--team">
        Ingresa el nombre de tu organización para conectarte con tu equipo.
      </p>

      <div className="register__org">
        <TextField
          label="Nombre de tu organización"
          placeholder="Ej: Agencia ..."
          autoComplete="organization"
          hint="Crearemos tu equipo con este nombre. Si ya existe, pide el código a tu líder."
          value={draft.orgName}
          onChange={(e) => update({ orgName: e.target.value })}
        />
      </div>

      <div className="register__divider" aria-hidden="true">
        <span className="register__divider-line" />
        <span className="register__divider-text">o</span>
        <span className="register__divider-line" />
      </div>

      <TeamCodeCard
        className="register__team-code"
        value={draft.teamCode}
        error={codeError}
        onChange={(teamCode) => {
          update({ teamCode });
          setCodeError(null);
        }}
      />

      {formError && (
        <p className="field__msg field__msg--error register__form-error" role="alert">
          {formError}
        </p>
      )}
    </OnboardingLayout>
  );
}
