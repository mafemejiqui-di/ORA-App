import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import lockIcon from "../../assets/icons/lock.svg";
import { Button } from "../../components/Button";
import { ChipSelector } from "../../components/ChipSelector";
import { EstadoSelector } from "../../components/EstadoSelector";
import { FlowQuestion, FlowScreen } from "../../components/FlowScreen";
import { OptionList } from "../../components/OptionList";
import { useToast } from "../../components/Toast";
import { ApiError } from "../../data/api";
import { COMPARACION_OPTIONS, FUNCIONO_OPTIONS, INTENCIONES_MAX, INTENCIONES_OPTIONS } from "../../data/closing";
import { useAuth } from "../../state/AuthContext";
import { days, getCycleKey, getCycleStatus } from "../../utils/cycle";

/** "Cierre del ciclo": retrospectiva de cierre. Una por ciclo; después solo se pueden ver las respuestas. */
export function Closing() {
  const navigate = useNavigate();
  const { user, team, saveClosing } = useAuth();
  const { showToast } = useToast();

  const cycle = getCycleStatus(team);
  const saved = user?.closings?.[getCycleKey(team)];

  const [comparacion, setComparacion] = useState<string | null>(saved?.comparacion ?? null);
  const [funciono, setFunciono] = useState<string | null>(saved?.funciono ?? null);
  const [intenciones, setIntenciones] = useState<string[]>(saved?.intenciones ?? []);
  const [saving, setSaving] = useState(false);
  const readOnly = Boolean(saved) || saving;

  // Solo en la semana 3; quien ya cerró puede volver a ver sus respuestas.
  if (!user || !cycle || (!cycle.closingOpen && !saved)) return <Navigate to="/inicio" replace />;

  async function close() {
    if (readOnly) return;
    setSaving(true);
    try {
      await saveClosing({ comparacion, funciono, intenciones, savedAt: new Date().toISOString() });
      showToast("Ciclo cerrado", "primary");
      navigate("/inicio");
    } catch (err) {
      setSaving(false);
      showToast(err instanceof ApiError ? err.message : "No pudimos cerrar el ciclo. Inténtalo de nuevo.");
    }
  }

  return (
    <FlowScreen
      title="Cierre del ciclo"
      subtitle={`Retrospectiva de cierre · Ciclo ${cycle.number}`}
      meta={cycle.closingOpen ? `Cierra en ${days(cycle.daysLeft)}` : undefined}
      onBack={() => navigate("/inicio")}
      footer={
        saved && !saving ? (
          <>
            <p className="flow__done-note flow__done-note--locked">
              <img src={lockIcon} width={13} height={13} alt="" />
              Ya cerraste este ciclo: no se pueden agregar más respuestas.
            </p>
            <Button variant="outline" onClick={() => navigate("/inicio")}>
              Volver al inicio
            </Button>
          </>
        ) : (
          <Button onClick={() => void close()} disabled={saving || !comparacion || !funciono || intenciones.length === 0}>
            Cerrar este ciclo
          </Button>
        )
      }
    >
      <FlowQuestion
        id="closing-q1"
        question="¿Cómo termino este ciclo comparado con cómo lo empecé?"
        hint="Compara con tu estado al inicio del ciclo."
      >
        <EstadoSelector
          options={COMPARACION_OPTIONS}
          value={comparacion}
          onChange={setComparacion}
          labelledBy="closing-q1"
          readOnly={readOnly}
        />
      </FlowQuestion>

      <FlowQuestion id="closing-q2" question="¿Qué funcionó mejor en el equipo este ciclo?" hint="Una sola respuesta.">
        <ChipSelector
          options={FUNCIONO_OPTIONS}
          multiSelect={false}
          selectedColor="primary"
          value={funciono ? [funciono] : []}
          onChange={(next) => setFunciono(next[0] ?? null)}
          labelledBy="closing-q2"
          readOnly={readOnly}
        />
      </FlowQuestion>

      <FlowQuestion
        id="closing-q3"
        question="¿Qué te llevas al siguiente ciclo?"
        hint={`Elige hasta ${INTENCIONES_MAX} intenciones.`}
      >
        <OptionList
          options={INTENCIONES_OPTIONS}
          value={intenciones}
          onChange={setIntenciones}
          labelledBy="closing-q3"
          max={INTENCIONES_MAX}
          readOnly={readOnly}
        />
      </FlowQuestion>
    </FlowScreen>
  );
}
