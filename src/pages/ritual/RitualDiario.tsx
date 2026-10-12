import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import lockIcon from "../../assets/icons/lock.svg";
import { BackChevron } from "../../components/BackChevron";
import { Button } from "../../components/Button";
import { ChipSelector } from "../../components/ChipSelector";
import { EstadoSelector } from "../../components/EstadoSelector";
import { useToast } from "../../components/Toast";
import { ESTADO_OPTIONS, getQuestionForDate, INTENCION_OPTIONS, REFLEXION_OPTIONS } from "../../data/ritual";
import { useAuth } from "../../state/AuthContext";
import { toLocalIso } from "../../utils/ritual";
import "./RitualDiario.css";

const BACK_DELAY_MS = 500;

export function RitualDiario() {
  const navigate = useNavigate();
  const { user, saveRitual } = useAuth();
  const { showToast } = useToast();

  // Un solo "hoy" mientras la hoja está abierta, aunque pase la medianoche.
  const now = useMemo(() => new Date(), []);
  const todayEntry = user?.rituals?.[toLocalIso(now)];

  // Si ya hiciste el ritual hoy, se abre con tus respuestas solo para verlas; se habilita de nuevo mañana.
  const [estado, setEstado] = useState<string | null>(todayEntry?.estado ?? null);
  const [reflexiones, setReflexiones] = useState<string[]>(todayEntry?.reflexiones ?? []);
  const [intencion, setIntencion] = useState<string | null>(todayEntry?.intencion ?? null);
  const [completing, setCompleting] = useState(false);
  const backTimer = useRef<number>();
  const alreadyDone = Boolean(todayEntry) && !completing;
  const readOnly = Boolean(todayEntry) || completing;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") navigate("/inicio");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(backTimer.current);
    };
  }, [navigate]);

  if (!user) return <Navigate to="/" replace />;

  async function complete() {
    if (readOnly) return;
    setCompleting(true);
    try {
      await saveRitual({ estado, reflexiones, intencion, savedAt: new Date().toISOString() }, now);
      backTimer.current = window.setTimeout(() => navigate("/inicio"), BACK_DELAY_MS);
    } catch {
      setCompleting(false);
      showToast("No pudimos guardar tu ritual. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="ritual" role="dialog" aria-modal="true" aria-labelledby="ritual-title">
      <header className="ritual__header">
        <button type="button" className="ritual__close" aria-label="Cerrar sin completar" onClick={() => navigate("/inicio")}>
          <span className="ritual__handle" />
        </button>
        <div className="ritual__top">
          <BackChevron className="ritual__back" onClick={() => navigate("/inicio")} />
          <h1 className="ritual__title" id="ritual-title">
            Ritual diario
          </h1>
        </div>
        <p className="ritual__sub">
          2 min · Solo tú ves esto <img src={lockIcon} width={12} height={12} alt="" />
        </p>
      </header>

      <div className="ritual__scroll">
        <section className="ritual__block" aria-labelledby="ritual-q1">
          <p className="ritual__step">Paso 1</p>
          <h2 className="ritual__question" id="ritual-q1">
            ¿Cómo llegas hoy?
          </h2>
          <EstadoSelector
            options={ESTADO_OPTIONS}
            value={estado}
            onChange={setEstado}
            labelledBy="ritual-q1"
            readOnly={readOnly}
          />
        </section>

        <section className="ritual__block" aria-labelledby="ritual-q2">
          <p className="ritual__step">Paso 2</p>
          <h2 className="ritual__question ritual__question--spaced" id="ritual-q2">
            {getQuestionForDate(now)}
          </h2>
          <p className="ritual__hint">Puedes elegir varias</p>
          <ChipSelector
            options={REFLEXION_OPTIONS}
            multiSelect
            selectedColor="primary"
            value={reflexiones}
            onChange={setReflexiones}
            labelledBy="ritual-q2"
            readOnly={readOnly}
          />
        </section>

        <section className="ritual__block" aria-labelledby="ritual-q3">
          <p className="ritual__step">Paso 3</p>
          <h2 className="ritual__question ritual__question--spaced" id="ritual-q3">
            ¿Qué intención te llevas hoy?
          </h2>
          <ChipSelector
            options={INTENCION_OPTIONS}
            multiSelect={false}
            selectedColor="burgundy"
            value={intencion ? [intencion] : []}
            onChange={(next) => setIntencion(next[0] ?? null)}
            labelledBy="ritual-q3"
            readOnly={readOnly}
          />
        </section>
      </div>

      <footer className="ritual__footer">
        {alreadyDone ? (
          <>
            <p className="ritual__done-note">Ya completaste tu ritual de hoy. Podrás hacerlo de nuevo mañana.</p>
            <Button variant="outline" onClick={() => navigate("/inicio")}>
              Volver al inicio
            </Button>
          </>
        ) : (
          <Button onClick={() => void complete()} disabled={completing}>
            Completar ritual
          </Button>
        )}
      </footer>
    </div>
  );
}
