import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, TextButton } from "../components/Button";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { PasswordField, TextField } from "../components/TextField";
import { useToast } from "../components/Toast";
import { ApiError } from "../data/api";
import { useAuth } from "../state/AuthContext";
import { isValidEmail } from "../utils/validation";
import "./Login.css";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email) || !password) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      // Quien aún no ha escrito su Tótem pasa primero por él.
      navigate(user.totem || user.isAdmin ? "/inicio" : "/totem", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingLayout
      onBack={() => navigate("/")}
      footerVariant="plain"
      onSubmit={handleSubmit}
      footer={
        <>
          <Button variant="primary" type="submit" disabled={busy}>
            Ingresar
          </Button>
          <p className="login__signup">
            ¿No tienes cuenta?{" "}
            <TextButton className="login__signup-link" onClick={() => navigate("/registro/1")}>
              Crear una
            </TextButton>
          </p>
        </>
      }
    >
      <h1 className="login__title">Bienvenido de nuevo</h1>
      <div className="login__fields">
        <TextField
          label="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="Contraseña"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="login__forgot">
          <TextButton
            className="login__forgot-link"
            onClick={() => showToast("Recuperar la contraseña estará disponible cuando conectemos el servidor.")}
          >
            ¿Olvidaste tu contraseña?
          </TextButton>
        </div>
        {error && (
          <p className="field__msg field__msg--error" role="alert">
            {error}
          </p>
        )}
      </div>
    </OnboardingLayout>
  );
}
