import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import "./ComingSoon.css";

// Marcador temporal para las pantallas que se construyen en las siguientes fases.
export function ComingSoon({ title, backTo = "/inicio" }: { title: string; backTo?: string }) {
  const navigate = useNavigate();

  return (
    <main className="coming-soon">
      <p className="section-label">Próxima fase</p>
      <h1 className="coming-soon__title">{title}</h1>
      <p className="coming-soon__text">Esta pantalla se construye en la siguiente fase.</p>
      <Button variant="outline" onClick={() => navigate(backTo)}>
        Volver
      </Button>
    </main>
  );
}
