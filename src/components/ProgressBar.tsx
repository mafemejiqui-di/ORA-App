import "./ProgressBar.css";

type ProgressBarProps = {
  /** Avance de 0 a 1. */
  value: number;
  label: string;
  className?: string;
};

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div
      className={["progress", className].filter(Boolean).join(" ")}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <div className="progress__fill" style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}
