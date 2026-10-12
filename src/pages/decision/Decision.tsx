import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { ChipSelector } from "../../components/ChipSelector";
import { FlowQuestion, FlowScreen } from "../../components/FlowScreen";
import { useToast } from "../../components/Toast";
import { ApiError } from "../../data/api";
import { FRENO_MAX, FRENO_OPTIONS, TIPO_OPTIONS, URGENCIA_OPTIONS } from "../../data/decision";
import { useAuth } from "../../state/AuthContext";
import { getCycleStatus } from "../../utils/cycle";
import "./Decision.css";

/** "Tomar una decisión": acompañamiento en tensión, de uso puntual (se puede registrar varias veces). */
export function Decision() {
  const navigate = useNavigate();
  const { user, team, saveDecision } = useAuth();
  const { showToast } = useToast();

  const [tipo, setTipo] = useState<string | null>(null);
  const [frenos, setFrenos] = useState<string[]>([]);
  const [urgencia, setUrgencia] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Abierto siempre (uso puntual), pero queda registrado en el ciclo del equipo: hace falta equipo.
  const cycle = getCycleStatus(team);
  if (!user || !cycle) return <Navigate to="/inicio" replace />;

  async function register() {
    setSaving(true);
    try {
      await saveDecision({ tipo, frenos, urgencia, savedAt: new Date().toISOString() });
      showToast("Decisión registrada", "primary");
      navigate("/inicio");
    } catch (err) {
      setSaving(false);
      showToast(err instanceof ApiError ? err.message : "No pudimos registrar tu decisión. Inténtalo de nuevo.");
    }
  }

  return (
    <FlowScreen
      title="Tomar una decisión"
      subtitle="Acompañamiento en tensión · uso puntual"
      onBack={() => navigate("/inicio")}
      footer={
        <Button onClick={() => void register()} disabled={saving || !tipo || frenos.length === 0 || !urgencia}>
          Registrar decisión
        </Button>
      }
    >
      <FlowQuestion id="decision-q1" question="¿Qué tipo de decisión estoy enfrentando?" hint="Una sola respuesta.">
        <ChipSelector
          options={TIPO_OPTIONS}
          multiSelect={false}
          selectedColor="primary"
          value={tipo ? [tipo] : []}
          onChange={(next) => setTipo(next[0] ?? null)}
          labelledBy="decision-q1"
        />
      </FlowQuestion>

      <FlowQuestion id="decision-q2" question="¿Qué está frenando la decisión?" hint={`Puedes elegir hasta ${FRENO_MAX}.`}>
        <ChipSelector
          options={FRENO_OPTIONS}
          multiSelect
          max={FRENO_MAX}
          selectedColor="primary"
          value={frenos}
          onChange={setFrenos}
          labelledBy="decision-q2"
        />
      </FlowQuestion>

      <FlowQuestion id="decision-q3" question="¿Qué tan urgente es esta decisión?" hint="Elige una opción.">
        <div className="urgency" role="radiogroup" aria-labelledby="decision-q3">
          {URGENCIA_OPTIONS.map((option) => {
            const selected = urgencia === option.label;
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? "urgency__option is-selected" : "urgency__option"}
                onClick={() => setUrgencia(selected ? null : option.label)}
              >
                <span className="urgency__label">{option.label}</span>
                <span className="urgency__detail">{option.detail}</span>
              </button>
            );
          })}
        </div>
      </FlowQuestion>
    </FlowScreen>
  );
}
