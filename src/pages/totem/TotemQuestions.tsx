import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { TextArea } from "../../components/TextArea";
import { useAuth } from "../../state/AuthContext";
import { useTotemDraft } from "../../state/TotemContext";
import { isFilled } from "../../utils/validation";
import { TotemQuestion } from "./TotemQuestion";

// Las tres preguntas son obligatorias: no se puede avanzar con una respuesta vacía.
const REQUIRED_MESSAGE = "Escribe tu respuesta para continuar.";

export function TotemQuestion1() {
  const navigate = useNavigate();
  const { draft, update } = useTotemDraft();
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  function next() {
    if (!isFilled(draft.persona)) {
      setError(REQUIRED_MESSAGE);
      field.current?.focus();
      return;
    }
    navigate("/totem/2");
  }

  return (
    <TotemQuestion
      step={1}
      dimension="Persona"
      title="¿Qué patrones repites de liderazgo?"
      ctaLabel="Siguiente"
      onBack={() => navigate("/totem")}
      onNext={next}
    >
      <TextArea
        ref={field}
        label="Patrones de liderazgo que repites"
        placeholder="Escribe aquí..."
        aria-required="true"
        value={draft.persona}
        error={error}
        onChange={(e) => {
          update({ persona: e.target.value });
          if (isFilled(e.target.value)) setError(null);
        }}
      />
    </TotemQuestion>
  );
}

export function TotemQuestion2() {
  const navigate = useNavigate();
  const { draft, update } = useTotemDraft();
  const [errors, setErrors] = useState<{ sobra: string | null; falta: string | null }>({ sobra: null, falta: null });
  const sobraField = useRef<HTMLTextAreaElement>(null);
  const faltaField = useRef<HTMLTextAreaElement>(null);

  if (!isFilled(draft.persona)) return <Navigate to="/totem/1" replace />;

  function next() {
    const missingSobra = !isFilled(draft.equipoSobra);
    const missingFalta = !isFilled(draft.equipoFalta);
    if (missingSobra || missingFalta) {
      setErrors({ sobra: missingSobra ? REQUIRED_MESSAGE : null, falta: missingFalta ? REQUIRED_MESSAGE : null });
      (missingSobra ? sobraField : faltaField).current?.focus();
      return;
    }
    navigate("/totem/3");
  }

  return (
    <TotemQuestion
      step={2}
      dimension="Equipo"
      title="¿Qué aportas y qué no estás dando?"
      ctaLabel="Siguiente"
      onBack={() => navigate("/totem/1")}
      onNext={next}
    >
      <div className="totem-field">
        <label className="totem-field__label" htmlFor="totem-sobra">
          Le sobra de mí...
        </label>
        <TextArea
          ref={sobraField}
          id="totem-sobra"
          label="Lo que sobra de mí en el equipo"
          size="short"
          placeholder="¿Qué das en exceso?"
          aria-required="true"
          value={draft.equipoSobra}
          error={errors.sobra}
          onChange={(e) => {
            update({ equipoSobra: e.target.value });
            if (isFilled(e.target.value)) setErrors((prev) => ({ ...prev, sobra: null }));
          }}
        />
      </div>
      <div className="totem-field">
        <label className="totem-field__label" htmlFor="totem-falta">
          Le falta de mí...
        </label>
        <TextArea
          ref={faltaField}
          id="totem-falta"
          label="Lo que le falta de mí al equipo"
          size="short"
          placeholder="¿Qué retienes sin darte cuenta?"
          aria-required="true"
          value={draft.equipoFalta}
          error={errors.falta}
          onChange={(e) => {
            update({ equipoFalta: e.target.value });
            if (isFilled(e.target.value)) setErrors((prev) => ({ ...prev, falta: null }));
          }}
        />
      </div>
    </TotemQuestion>
  );
}

export function TotemQuestion3() {
  const navigate = useNavigate();
  const { saveTotem } = useAuth();
  const { draft, update, reset } = useTotemDraft();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  // Si faltan respuestas anteriores (p. ej. se abrió la dirección directamente), se vuelve a la primera que falta.
  if (!isFilled(draft.persona)) return <Navigate to="/totem/1" replace />;
  if (!isFilled(draft.equipoSobra) || !isFilled(draft.equipoFalta)) return <Navigate to="/totem/2" replace />;

  async function save() {
    if (!isFilled(draft.accion)) {
      setError(REQUIRED_MESSAGE);
      field.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await saveTotem({
        persona: draft.persona.trim(),
        equipoSobra: draft.equipoSobra.trim(),
        equipoFalta: draft.equipoFalta.trim(),
        accion: draft.accion.trim(),
        savedAt: new Date().toISOString(),
      });
      // Primero se navega y después se limpia el borrador, para que esta pantalla
      // no llegue a verse con el borrador vacío (la guarda la mandaría a la pregunta 1).
      navigate("/totem/listo", { replace: true });
      reset();
    } finally {
      setBusy(false);
    }
  }

  return (
    <TotemQuestion
      step={3}
      dimension="Acción"
      title="Hoy lidero desde..."
      ctaLabel="Guardar mi tótem"
      busy={busy}
      onBack={() => navigate("/totem/2")}
      onNext={() => void save()}
    >
      <TextArea
        ref={field}
        label="Desde dónde lidero hoy"
        placeholder="Lidero desde..."
        aria-required="true"
        value={draft.accion}
        error={error}
        onChange={(e) => {
          update({ accion: e.target.value });
          if (isFilled(e.target.value)) setError(null);
        }}
      />
    </TotemQuestion>
  );
}
