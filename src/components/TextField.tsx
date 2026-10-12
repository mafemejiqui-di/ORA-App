import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import eyeIcon from "../assets/icons/eye.svg";
import eyeOffIcon from "../assets/icons/eye-off.svg";
import "./TextField.css";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Nombre accesible; el diseño usa solo placeholder, sin etiqueta visible. */
  label: string;
  hint?: string;
  error?: string | null;
  trailing?: ReactNode;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, trailing, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-msg`;
  const message = error ?? hint;
  const inputClass = ["field__input", trailing ? "field__input--with-trailing" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <div className="field__control">
        <input
          ref={ref}
          id={inputId}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={inputClass}
          {...rest}
        />
        {trailing}
      </div>
      {message && (
        <p
          id={messageId}
          className={error ? "field__msg field__msg--error" : "field__msg"}
          role={error ? "alert" : undefined}
        >
          {message}
        </p>
      )}
    </div>
  );
});

export const PasswordField = forwardRef<HTMLInputElement, Omit<TextFieldProps, "type" | "trailing">>(
  function PasswordField(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <TextField
        ref={ref}
        {...props}
        type={visible ? "text" : "password"}
        trailing={
          <button
            type="button"
            className="field__toggle"
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            <img src={visible ? eyeOffIcon : eyeIcon} width={18} height={18} alt="" />
          </button>
        }
      />
    );
  },
);
