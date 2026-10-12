import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import "./TextArea.css";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Nombre accesible; el diseño usa solo placeholder. */
  label: string;
  size?: "tall" | "short";
  /** Mensaje de error bajo el campo. */
  error?: string | null;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, size = "tall", error, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const messageId = `${textareaId}-msg`;
  const classes = ["textarea", `textarea--${size}`, className].filter(Boolean).join(" ");

  return (
    <>
      <textarea
        ref={ref}
        id={textareaId}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        className={classes}
        {...rest}
      />
      {error && (
        <p id={messageId} className="textarea__msg" role="alert">
          {error}
        </p>
      )}
    </>
  );
});
