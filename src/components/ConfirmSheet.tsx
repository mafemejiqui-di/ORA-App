import { useEffect, useRef } from "react";
import { Button } from "./Button";
import "./ConfirmSheet.css";

type ConfirmSheetProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Panel inferior de confirmación (p. ej. "¿Cerrar sesión?"). */
export function ConfirmSheet({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmSheetProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="sheet-overlay" onClick={onCancel}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        aria-describedby="sheet-message"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="sheet__title" id="sheet-title">
          {title}
        </h2>
        <p className="sheet__message" id="sheet-message">
          {message}
        </p>
        <div className="sheet__actions">
          <Button ref={confirmRef} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <button type="button" className="sheet__cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
