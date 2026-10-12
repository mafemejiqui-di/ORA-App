import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { ChipSelector } from "../../components/ChipSelector";
import { EstadoSelector } from "../../components/EstadoSelector";
import { FlowQuestion, FlowScreen } from "../../components/FlowScreen";
import { OptionList } from "../../components/OptionList";
import { useToast } from "../../components/Toast";
import { ApiError } from "../../data/api";
import { ACTITUD_OPTIONS, SENTIR_OPTIONS } from "../../data/diagnosis";
import { ESTADO_OPTIONS } from "../../data/ritual";
import { useAuth } from "../../state/AuthContext";
import { days, getCycleKey, getCycleStatus } from "../../utils/cycle";

/** "Ver cómo estamos": diagnóstico de inicio, abierto en la semana 1 de cada ciclo. */
export function Diagnosis() {
  const navigate = useNavigate();
  const { user, team, saveDiagnosis } = useAuth();
  const { showToast } = useToast();

  const cycle = getCycleStatus(team);
  const saved = user?.diagnoses?.[getCycleKey(team)];

  // Si ya lo guardaste en este ciclo, se abre con tus respuestas solo para verlas.
  const [estado, setEstado] = useState<string | null>(saved?.estado ?? null);
  const [sentir, setSentir] = useState<string | null>(saved?.sentir ?? null);
  const [actitud, setActitud] = useState<string | null>(saved?.actitud ?? null);
  const [saving, setSaving] = useState(false);
  const readOnly = Boolean(saved) || saving;

  // Solo en la semana 1; después, quien ya respondió puede volver a ver sus respuestas.
  if (!user || !cycle || (!cycle.diagnosisOpen && !saved)) return <Navigate to="/inicio" replace />;

  async function save() {
    if (readOnly) return;
    setSaving(true);
    try {
      await saveDiagnosis({ estado, sentir, actitud, savedAt: new Date().toISOString() });
      showToast("Diagnóstico guardado", "primary");
      navigate("/inicio");
    } catch (err) {
      setSaving(false);
      showToast(err instanceof ApiError ? err.message : "No pudimos guardar tu diagnóstico. Inténtalo de nuevo.");
    }
  }

  return (
    <FlowScreen
      title="Ver cómo estamos"
      subtitle={`Diagnóstico de inicio · Ciclo ${cycle.number}`}
      meta={cycle.diagnosisOpen ? `Cierra en ${days(8 - cycle.day)}` : undefined}
      onBack={() => navigate("/inicio")}
      footer={
        saved && !saving ? (
          <>
            <p className="flow__done-note">Ya guardaste tu diagnóstico de este ciclo.</p>
            <Button variant="outline" onClick={() => navigate("/inicio")}>
              Volver al inicio
            </Button>
          </>
        ) : (
          <Button onClick={() => void save()} disabled={saving || !estado || !sentir || !actitud}>
            Guardar diagnóstico
          </Button>
        )
      }
    >
      <FlowQuestion id="diagnosis-q1" question="¿Cómo llego a este ciclo?" hint="Elige el estado que mejor te describe hoy.">
        <EstadoSelector
          options={ESTADO_OPTIONS}
          value={estado}
          onChange={setEstado}
          labelledBy="diagnosis-q1"
          readOnly={readOnly}
        />
      </FlowQuestion>

      <FlowQuestion id="diagnosis-q2" question="¿Qué siento en el equipo ahora mismo?" hint="Una sola respuesta.">
        <ChipSelector
          options={SENTIR_OPTIONS}
          multiSelect={false}
          selectedColor="primary"
          value={sentir ? [sentir] : []}
          onChange={(next) => setSentir(next[0] ?? null)}
          labelledBy="diagnosis-q2"
          readOnly={readOnly}
        />
      </FlowQuestion>

      <FlowQuestion
        id="diagnosis-q3"
        question="¿Qué actitud notas más en el equipo esta semana?"
        hint="El sistema identifica el patrón a partir de tu respuesta."
      >
        <OptionList
          options={ACTITUD_OPTIONS}
          value={actitud ? [actitud] : []}
          onChange={(next) => setActitud(next[0] ?? null)}
          labelledBy="diagnosis-q3"
          readOnly={readOnly}
        />
      </FlowQuestion>
    </FlowScreen>
  );
}
