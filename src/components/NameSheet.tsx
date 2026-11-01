import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { TextField } from "./TextField";
import "./NameSheet.css";

const MAX_NAME = 80;

type NameSheetProps = {
  open: boolean;
  currentName: string;
  /** Guarda el nombre ya limpio; si falla, la ventana muestra el error y sigue abierta. */
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
};

/** Ventana flotante para cambiar el nombre de usuario (abre desde el lápiz del Perfil). */
export function NameSheet({ open, currentName, onSave, onClose }: NameSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewport, setViewport] = useState<CSSProperties | undefined>();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // El fondo ocupa solo la parte visible de la pantalla (sin el teclado), así la tarjeta
  // queda justo encima del teclado en cualquier celular, también en iPhone donde la página no se encoge.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!open || !vv) return;
    const update = () => {
      setViewport({ top: vv.offsetTop, height: vv.height, bottom: "auto" });
      // Si al área visible le falta un buen pedazo de la pantalla, es porque el teclado está abierto.
      setKeyboardOpen(window.innerHeight - vv.height > 120);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);

  // Cada vez que se abre arranca con el nombre actual (y no se reinicia mientras se escribe).
  useEffect(() => {
    if (!open) return;
    setValue(currentName);
    setError(null);
    inputRef.current?.focus();
    inputRef.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mientras está abierta, la página de atrás no se desplaza (en iPhone dejaría ver partes sin desenfocar).
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const trimmed = value.trim().replace(/\s+/g, " ");
  const unchanged = trimmed === currentName.trim();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed) {
      setError("Escribe tu nombre.");
      return;
    }
    if (unchanged) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
    } catch {
      setError("No pudimos guardar tu nombre. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  // Se dibuja directo en <body> para que ningún contenedor de la página recorte el fondo.
  return createPortal(
    <>
      {/* Fondo arenado: siempre a pantalla completa (y un poco más), aparte de la tarjeta que sigue al teclado. */}
      <div className="name-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className={keyboardOpen ? "name-sheet-overlay name-sheet-overlay--keyboard" : "name-sheet-overlay"}
        style={viewport}
      >
        <form
          className="name-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="name-sheet-title"
          onSubmit={(event) => void submit(event)}
          noValidate
        >
          <div className="name-sheet__head">
            <h2 className="name-sheet__title" id="name-sheet-title">
              Tu nombre
            </h2>
            <button type="button" className="name-sheet__close" aria-label="Cerrar" onClick={onClose}>
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <TextField
            ref={inputRef}
            label="Nombre de usuario"
            placeholder="Escribe tu nombre"
            autoComplete="name"
            maxLength={MAX_NAME}
            value={value}
            error={error}
            hint="Así te verá tu equipo en ORA."
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
          />
          <Button type="submit" className="name-sheet__save" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </div>
    </>,
    document.body,
  );
}
