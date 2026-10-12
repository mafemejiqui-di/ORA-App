import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { CircleBackdrop } from "../../components/CircleBackdrop";
import { FillingTotem } from "../../components/FillingTotem";
import { Tag } from "../../components/Tag";
import { useAuth } from "../../state/AuthContext";
import "./Totem.css";

const EMPTY_VALUE = "—";

export function TotemDone() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const totem = user?.totem;

  if (!totem) return <Navigate to="/totem" replace />;

  const rows = [
    { label: "Persona", tone: "teal" as const, value: totem.persona },
    { label: "Equipo", tone: "teal" as const, value: [totem.equipoSobra, totem.equipoFalta].filter(Boolean).join(" · ") },
    { label: "Acción", tone: "warm" as const, value: totem.accion },
  ];

  return (
    <main className="totem totem-centered totem-centered--done">
      <CircleBackdrop variant="corners" />
      <FillingTotem />
      <p className="totem__eyebrow">Tótem guardado</p>
      <h1 className="totem__title">Tu postura de liderazgo está lista.</h1>

      <ul className="totem-done__summary">
        {rows.map((row) => (
          <li key={row.label} className="totem-done__row">
            <Tag tone={row.tone} size="sm">
              {row.label}
            </Tag>
            <span className="totem-done__value">{row.value || EMPTY_VALUE}</span>
          </li>
        ))}
      </ul>

      <Button className="totem-centered__cta totem-done__cta" onClick={() => navigate("/inicio")}>
        Entrar a la app
      </Button>
    </main>
  );
}
