import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { useAuth } from "../state/AuthContext";
import logoOra from "../assets/ora-logo.png";
import circleRose267 from "../assets/circle-rose-267.svg";
import circleRose318 from "../assets/circle-rose-318.svg";
import circleTeal331 from "../assets/circle-teal-331x340.svg";
import circleTeal265 from "../assets/circle-teal-265x272.svg";
import "./Landing.css";

export function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Mientras se recupera la sesión guardada no se muestra nada (la cubre el Splash).
  if (loading) return null;
  // Quien ya tiene sesión no vuelve a ver la bienvenida.
  if (user) return <Navigate to={user.totem || user.isAdmin ? "/inicio" : "/totem"} replace />;

  return (
    <main className="landing">
      <div className="landing__circles" aria-hidden="true">
        <img
          className="landing__circle landing__circle--rose-267"
          src={circleRose267}
          width={267}
          height={267}
          alt=""
        />
        <img
          className="landing__circle landing__circle--rose-318"
          src={circleRose318}
          width={318}
          height={318}
          alt=""
        />
        <img
          className="landing__circle landing__circle--teal-331"
          src={circleTeal331}
          width={331}
          height={340}
          alt=""
        />
        <img
          className="landing__circle landing__circle--teal-265"
          src={circleTeal265}
          width={265}
          height={272}
          alt=""
        />
      </div>

      <header className="landing__header">
        <h1 className="landing__phase">
          <span className="landing__phase-number">03 </span>Fase Ciclo
        </h1>
        <p className="landing__tagline">
          Una herramienta para liderar con más conciencia.
        </p>
      </header>

      <div className="landing__footer">
        <img
          className="landing__logo"
          src={logoOra}
          width={272}
          height={110}
          alt="ORA"
        />
        <div className="landing__actions">
          <Button variant="primary" onClick={() => navigate("/registro/1")}>
            Crear cuenta
          </Button>
          <div className="landing__login">
            <Button variant="outline" onClick={() => navigate("/iniciar-sesion")}>
              Ya tengo cuenta
            </Button>
            <p className="landing__note">
              Cada miembro del equipo crea su propia cuenta
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
