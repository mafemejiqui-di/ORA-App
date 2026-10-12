import { useLocation, useNavigate } from "react-router-dom";
import totemOutline from "../../assets/icons/totem-outline.svg";
import { BackChevron } from "../../components/BackChevron";
import { Button } from "../../components/Button";
import { CircleBackdrop } from "../../components/CircleBackdrop";
import { useAuth } from "../../state/AuthContext";
import "./Totem.css";

export function TotemIntro() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const location = useLocation();
  const cameFromAccountCreated = (location.state as { from?: string } | null)?.from === "cuenta-creada";

  function goBack() {
    if (cameFromAccountCreated) {
      navigate("/cuenta-creada");
      return;
    }
    // Se llegó iniciando sesión con una cuenta sin Tótem: el paso anterior es el login.
    logout();
    navigate("/iniciar-sesion", { replace: true });
  }

  return (
    <main className="totem totem-centered">
      <CircleBackdrop variant="corners" />
      <BackChevron className="totem-intro__back" onClick={goBack} />
      <img src={totemOutline} width={64} height={64} alt="" />
      <p className="totem__eyebrow">Tótem</p>
      <h1 className="totem__title">Antes de entrar, una pausa.</h1>
      <p className="totem__lead">
        Tres preguntas. Sin respuestas correctas. Lo que escribas aquí solo lo ves tú.
      </p>
      <Button className="totem-centered__cta" onClick={() => navigate("/totem/1")}>
        Empezar
      </Button>
    </main>
  );
}
