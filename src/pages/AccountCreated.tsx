import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import buildingIcon from "../assets/icons/building.svg";
import userIcon from "../assets/icons/user.svg";
import usersIcon from "../assets/icons/users-18.svg";
import { AnimatedCheckmark } from "../components/AnimatedCheckmark";
import { Button } from "../components/Button";
import { CircleBackdrop } from "../components/CircleBackdrop";
import { getGeneration } from "../data/catalogs";
import { useAuth } from "../state/AuthContext";
import { useRegistration } from "../state/RegistrationContext";
import "./AccountCreated.css";

// Reúne las pantallas "Cuenta creada" y "Cuenta enlazada" del diseño: mismos
// textos, con el resumen real de la persona. Si quedó ligada a un equipo se
// usa el fondo de "Cuenta enlazada".
export function AccountCreated() {
  const navigate = useNavigate();
  const { user, team, loading } = useAuth();
  const { reset } = useRegistration();

  useEffect(() => {
    reset();
  }, [reset]);

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;

  const generation = getGeneration(user.generation);

  return (
    <main className="created">
      <CircleBackdrop variant={team ? "full" : "split"} />

      <div className="created__content">
        <AnimatedCheckmark />
        <h1 className="created__title">¡Listo!</h1>
        <p className="created__subtitle">Tu cuenta está lista.</p>

        <ul className="created__summary">
          <li className="created__row created__row--name">
            <img src={userIcon} width={18} height={18} alt="" />
            <span>{user.name}</span>
          </li>
          <li className="created__row">
            <img src={usersIcon} width={18} height={18} alt="" />
            <span>{generation?.label ?? "Sin generación"}</span>
          </li>
          <li className="created__row">
            <img src={buildingIcon} width={18} height={18} alt="" />
            <span>{team?.name ?? "Sin equipo aún"}</span>
          </li>
        </ul>

        <p className="created__hint">Puedes editar esta información en tu perfil en cualquier momento.</p>
        <Button className="created__cta" onClick={() => navigate("/totem", { state: { from: "cuenta-creada" } })}>
          Comenzar
        </Button>
      </div>
    </main>
  );
}
