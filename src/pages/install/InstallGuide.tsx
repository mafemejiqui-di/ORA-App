import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../components/Button";
import { useToast } from "../../components/Toast";
import {
  detectPlatform,
  getInstallState,
  isInAppBrowser,
  promptInstall,
  subscribeInstall,
  type Platform,
} from "../../utils/install";
import "./InstallGuide.css";

type Tab = "ios" | "android";

/** Ícono de Compartir de Safari (cuadrado con flecha hacia arriba). */
const ShareIcon = () => (
  <svg className="install__inline-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3v12M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 10H5v11h14V10h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Ícono de "más" (cuadrado con +) de "Agregar a pantalla de inicio". */
const AddIcon = () => (
  <svg className="install__inline-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** Botón de tres puntos (horizontales) de la barra inferior de Safari. */
const MoreIcon = () => (
  <svg className="install__inline-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

/** Menú de tres puntos de Chrome. */
const MenuIcon = () => (
  <svg className="install__inline-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

const IOS_STEPS: ReactNode[] = [
  <>
    Abre este enlace en <strong>Safari</strong>. En iPhone, solo Safari permite instalar apps web.
  </>,
  <>
    Toca los <strong>tres puntos</strong> <MoreIcon /> en la parte inferior de Safari.
  </>,
  <>
    Toca el botón <strong>Compartir</strong> <ShareIcon />.
  </>,
  <>
    Desliza hacia abajo y toca <strong>Agregar a pantalla de inicio</strong> <AddIcon />. Si no aparece, toca{" "}
    <strong>Editar acciones</strong> y actívala.
  </>,
  <>
    Deja el nombre <strong>ORA</strong> y toca <strong>Agregar</strong> arriba a la derecha.
  </>,
  <>
    Busca el ícono de <strong>ORA</strong> en tu pantalla de inicio y ábrela desde ahí.
  </>,
];

const ANDROID_STEPS: ReactNode[] = [
  <>
    Abre este enlace en <strong>Google Chrome</strong>.
  </>,
  <>
    Toca el menú <MenuIcon /> (tres puntos) arriba a la derecha.
  </>,
  <>
    Toca <strong>Instalar aplicación</strong> o <strong>Agregar a la pantalla principal</strong>.
  </>,
  <>
    Confirma tocando <strong>Instalar</strong>.
  </>,
  <>
    Busca el ícono de <strong>ORA</strong> en tu pantalla de inicio o en tus apps y ábrela desde ahí.
  </>,
];

/** Instructivo que se ve al abrir el enlace desde el navegador: cómo instalar ORA en iPhone y Android. */
export function InstallGuide() {
  const { showToast } = useToast();
  const [platform] = useState<Platform>(() => detectPlatform());
  const [tab, setTab] = useState<Tab>(platform === "android" ? "android" : "ios");
  const [state, setState] = useState(getInstallState);
  const inApp = isInAppBrowser();
  const link = window.location.origin;

  useEffect(() => subscribeInstall(() => setState(getInstallState())), []);

  async function install() {
    const accepted = await promptInstall();
    if (accepted) showToast("¡Listo! Abre ORA desde tu pantalla de inicio.", "primary");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      showToast("Enlace copiado", "primary");
    } catch {
      showToast(link, "primary");
    }
  }

  const steps = tab === "ios" ? IOS_STEPS : ANDROID_STEPS;

  return (
    <main className="install">
      <header className="install__hero">
        <img className="install__icon" src="/icons/icon-192.png" width={88} height={88} alt="Ícono de ORA" />
        <h1 className="install__title">Instala ORA en tu celular</h1>
        <p className="install__lead">
          ORA es una app web: se instala desde el navegador, sin tiendas de aplicaciones. Una vez instalada, ábrela
          siempre desde su ícono en tu pantalla de inicio.
        </p>
      </header>

      {state.installed && (
        <p className="install__notice install__notice--done" role="status">
          ¡ORA ya está instalada! Ábrela desde el ícono en tu pantalla de inicio.
        </p>
      )}

      {inApp && (
        <p className="install__notice" role="note">
          Abriste el enlace dentro de otra app (por ejemplo WhatsApp o Instagram). Toca el menú de esa ventana y elige{" "}
          <strong>Abrir en {platform === "ios" ? "Safari" : "Chrome"}</strong> para poder instalar ORA.
        </p>
      )}

      {platform === "desktop" && (
        <div className="install__notice" role="note">
          <p className="install__notice-text">
            Estás en un computador. Abre este enlace desde tu celular para instalar ORA:
          </p>
          <button type="button" className="install__link" onClick={() => void copyLink()}>
            {link.replace(/^https?:\/\//, "")} <span className="install__link-action">Copiar</span>
          </button>
        </div>
      )}

      <div className="install__tabs" role="tablist" aria-label="Tipo de celular">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "ios"}
          className={tab === "ios" ? "install__tab is-active" : "install__tab"}
          onClick={() => setTab("ios")}
        >
          iPhone (iOS)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "android"}
          className={tab === "android" ? "install__tab is-active" : "install__tab"}
          onClick={() => setTab("android")}
        >
          Android
        </button>
      </div>

      <section className="install__card" role="tabpanel" aria-label={tab === "ios" ? "Pasos para iPhone" : "Pasos para Android"}>
        {tab === "android" && state.canPrompt && (
          <div className="install__quick">
            <Button onClick={() => void install()}>Instalar ORA</Button>
            <p className="install__quick-note">O, si prefieres, sigue estos pasos:</p>
          </div>
        )}
        <ol className="install__steps">
          {steps.map((step, index) => (
            <li key={index} className="install__step">
              <span className="install__step-number" aria-hidden="true">
                {index + 1}
              </span>
              <span className="install__step-text">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="install__footnote">
        ¿Ya la instalaste? Ábrela desde el ícono <strong>ORA</strong>. Si vuelves a entrar por el navegador, verás esta guía.
      </p>
    </main>
  );
}
