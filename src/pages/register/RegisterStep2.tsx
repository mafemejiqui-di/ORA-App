import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { Chip } from "../../components/Chip";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { SelectCard } from "../../components/SelectCard";
import { GENERATIONS, ROLES } from "../../data/catalogs";
import { useRegistration } from "../../state/RegistrationContext";
import "./Register.css";

export function RegisterStep2() {
  const navigate = useNavigate();
  const { draft, update } = useRegistration();

  if (!draft.name || !draft.email || !draft.password) {
    return <Navigate to="/registro/1" replace />;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    navigate("/registro/3");
  }

  return (
    <OnboardingLayout
      step={{ current: 2, total: 3 }}
      onBack={() => navigate("/registro/1")}
      onSubmit={handleSubmit}
      footer={<Button type="submit">Continuar</Button>}
    >
      <p className="onboarding__eyebrow">Tu contexto en el equipo</p>
      <p className="onboarding__lead">
        Esto ayuda al sistema a personalizar las preguntas según tu generación y rol.
      </p>

      <h2 className="onboarding__question register__question" id="role-label">
        ¿Cuál es tu rol en el equipo?
      </h2>
      <div className="chips register__roles" role="radiogroup" aria-labelledby="role-label">
        {ROLES.map((role) => (
          <Chip
            key={role}
            selected={draft.role === role}
            onClick={() => update({ role: draft.role === role ? null : role })}
          >
            {role}
          </Chip>
        ))}
      </div>

      <h2 className="onboarding__question register__question register__question--gap" id="generation-label">
        ¿A qué generación perteneces?
      </h2>
      <div className="select-card-grid register__generations" role="radiogroup" aria-labelledby="generation-label">
        {GENERATIONS.map((generation) => (
          <SelectCard
            key={generation.id}
            title={generation.label}
            subtitle={generation.range}
            selected={draft.generation === generation.id}
            onClick={() => update({ generation: draft.generation === generation.id ? null : generation.id })}
          />
        ))}
      </div>
    </OnboardingLayout>
  );
}
