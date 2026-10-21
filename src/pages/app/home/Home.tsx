import { useNavigate } from "react-router-dom";
import flameIcon from "../../../assets/icons/flame.svg";
import { Avatar } from "../../../components/Avatar";
import { StreakTracker } from "../../../components/StreakTracker";
import { useAuth } from "../../../state/AuthContext";
import { useTeamDashboard } from "../../../state/useTeamDashboard";
import { getRitualStats } from "../../../utils/ritual";
import { AdminHome } from "../../admin/AdminHome";
import { DotMap } from "./DotMap";
import { ModuleCarousel } from "./ModuleCarousel";
import "./Home.css";

export function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Patrones del equipo en vivo (vacío sin equipo; la administradora tiene su propia vista).
  const dashboard = useTeamDashboard();

  if (!user) return null;
  // La administradora ve todos los equipos, su uso y alertas.
  if (user.isAdmin) return <AdminHome />;

  const now = new Date();
  const stats = getRitualStats(user, now);
  const ritualDone = stats.completedToday;

  return (
    <main className="home">
      <header className="home__header">
        <div className="home__greeting">
          <div className="home__identity">
            <h1 className="home__title">Hola, {user.name}</h1>
            {user.role && <p className="home__role">{user.role}</p>}
          </div>
          <Avatar name={user.name} />
        </div>
      </header>

      <StreakTracker currentStreak={stats.streak} record={stats.record} weekDots={stats.weekDots} />

      <div className="home__section home__ritual-wrap">
        <button type="button" className="home__ritual" onClick={() => navigate("/ritual")}>
          <span className="home__ritual-text">
            <span className="home__ritual-title">Ritual diario</span>
            {/* Invitación fija; la pregunta del día se ve dentro del ritual. */}
            <span className="home__ritual-prompt">Haz una pausa antes de empezar</span>
          </span>
          {/* Fueguito en crema (el ícono se usa como máscara; va entre comillas, ver BottomNav). */}
          <span
            className="home__ritual-icon"
            aria-hidden="true"
            style={{ WebkitMaskImage: `url("${flameIcon}")`, maskImage: `url("${flameIcon}")` }}
          />
          <span className="sr-only">{ritualDone ? "Ver respuestas" : "Responder ahora"}</span>
        </button>
      </div>

      {/* Módulos del ciclo justo debajo del ritual y encima de los patrones del equipo. */}
      <div className="home__carousel">
        <ModuleCarousel />
      </div>

      <div className="home__section">
        <DotMap dashboard={dashboard.data} />
      </div>
    </main>
  );
}
