import type { FormEvent, ReactNode } from "react";
import { Button } from "../../components/Button";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { ProgressBar } from "../../components/ProgressBar";
import { Tag } from "../../components/Tag";
import "./Totem.css";

export const TOTEM_QUESTION_COUNT = 3;

type TotemQuestionProps = {
  step: number;
  dimension: string;
  title: string;
  /** Línea de ayuda bajo el título, en letra más pequeña. */
  subtitle?: ReactNode;
  ctaLabel: string;
  busy?: boolean;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
};

/** Estructura común de las tres preguntas: contador, etiqueta, título, campos y progreso. */
export function TotemQuestion({
  step,
  dimension,
  title,
  subtitle,
  ctaLabel,
  busy = false,
  onBack,
  onNext,
  children,
}: TotemQuestionProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onNext();
  }

  return (
    <OnboardingLayout
      className="totem"
      onBack={onBack}
      backIcon="chevron"
      step={{ current: step, total: TOTEM_QUESTION_COUNT }}
      onSubmit={handleSubmit}
      footer={
        <Button type="submit" disabled={busy}>
          {ctaLabel}
        </Button>
      }
    >
      <div className="totem-question__tag">
        <Tag>{dimension}</Tag>
      </div>
      <h1 className={subtitle ? "totem-question__title totem-question__title--with-subtitle" : "totem-question__title"}>
        {title}
      </h1>
      {subtitle && <p className="totem-question__subtitle">{subtitle}</p>}
      {children}
      <ProgressBar
        className="totem-question__progress"
        value={step / TOTEM_QUESTION_COUNT}
        label={`Progreso del tótem: pregunta ${step} de ${TOTEM_QUESTION_COUNT}`}
      />
    </OnboardingLayout>
  );
}
