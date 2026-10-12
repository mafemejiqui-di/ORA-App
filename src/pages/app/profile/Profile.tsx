import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoOra from "../../../assets/ora-logo.png";
import totemTriangle from "../../../assets/icons/totem-triangle-24.svg";
import { Avatar } from "../../../components/Avatar";
import { ConfirmSheet } from "../../../components/ConfirmSheet";
import { Tag } from "../../../components/Tag";
import { useToast } from "../../../components/Toast";
import { Toggle } from "../../../components/Toggle";
import { getGeneration } from "../../../data/catalogs";
import { DEFAULT_SETTINGS } from "../../../data/types";
import { disablePush, enablePush, getPushStatus, type PushStatus } from "../../../lib/push";
import { useAuth } from "../../../state/AuthContext";
import "./Profile.css";

const EMPTY_VALUE = "—";

export function Profile() {
  const navigate = useNavigate();
  const { user, team, logout, updateSettings } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { showToast } = useToast();
  // Estado de las notificaciones en ESTE celular (cada aparato se activa por separado).
  const [push, setPush] = useState<PushStatus | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    void getPushStatus().then(setPush);
  }, []);

  if (!user) return null;

  /** Recordatorio diario a las 8:00 a. m.: pide permiso al activarlo (toque de la persona). */
  async function toggleDailyReminder(next: boolean) {
    setPushBusy(true);
    try {
      if (next) {
        const status = await enablePush();
        setPush(status);
        if (status === "subscribed") {
          await updateSettings({ dailyRitualReminder: true });
          showToast("Listo: te recordaremos el ritual cada día a las 8:00 a. m.", "primary");
        } else if (status === "unsupported") {
          showToast("Para recibir notificaciones, instala ORA en tu pantalla de inicio y ábrela desde el ícono.");
        } else if (status === "denied") {
          showToast("Las notificaciones de ORA están bloqueadas. Actívalas en Ajustes del celular → Notificaciones → ORA.");
        }
      } else {
        await disablePush();
        setPush("off");
        await updateSettings({ dailyRitualReminder: false });
        showToast("Recordatorio diario desactivado en este celular.", "primary");
      }
    } catch {
      showToast("No pudimos cambiar el recordatorio. Inténtalo de nuevo.");
    } finally {
      setPushBusy(false);
    }
  }

  const settings = { ...DEFAULT_SETTINGS, ...user.settings };
  const generation = getGeneration(user.generation);
  const subtitle = user.isAdmin
    ? "Administradora"
    : [user.role, generation?.label].filter(Boolean).join(" · ") || "Completa tu rol y generación";
  const totem = user.totem;
  const totemRows = [
    { label: "Persona", tone: "teal" as const, value: totem?.persona },
    { label: "Equipo", tone: "teal" as const, value: [totem?.equipoSobra, totem?.equipoFalta].filter(Boolean).join(" · ") },
    { label: "Acción", tone: "warm" as const, value: totem?.accion },
  ];

  function confirmLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <main className="profile">
      <header className="profile__hero">
        <Avatar name={user.name} size="lg" />
        <h1 className="profile__name">{user.name}</h1>
        <p className="profile__role">{subtitle}</p>
        <img className="profile__logo" src={logoOra} width={45} height={16} alt="ORA" />
      </header>

      <section className="profile__section" aria-labelledby="profile-totem-label">
        <h2 className="section-label" id="profile-totem-label">
          Mi Tótem
        </h2>
        <div className="profile-totem">
          <div className="profile-totem__head">
            <span className="profile-totem__title">
              <img src={totemTriangle} width={24} height={24} alt="" />
              Tótem activo
            </span>
            {team?.cycleNumber ? <span className="profile-totem__cycle">Ciclo {team.cycleNumber}</span> : null}
          </div>
          <ul className="profile-totem__rows">
            {totemRows.map((row) => (
              <li key={row.label} className="profile-totem__row">
                <Tag tone={row.tone} size="sm">
                  {row.label}
                </Tag>
                <span className="profile-totem__value">{row.value || EMPTY_VALUE}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="profile__section profile__section--settings" aria-labelledby="profile-settings-label">
        <h2 className="section-label" id="profile-settings-label">
          Ajustes
        </h2>
        <ul className="settings">
          <li className="settings__row">
            <span className="settings__label">
              Notificación ritual diario
              <span className="settings__hint">Cada día a las 8:00 a. m.</span>
            </span>
            <Toggle
              label="Notificación ritual diario"
              checked={settings.dailyRitualReminder && push === "subscribed"}
              disabled={pushBusy || push === null}
              onChange={(next) => void toggleDailyReminder(next)}
            />
          </li>
          <li className="settings__row">
            <span className="settings__label">Recordatorio de ciclo</span>
            <Toggle
              label="Recordatorio de ciclo"
              checked={settings.cycleReminder}
              onChange={(next) => void updateSettings({ cycleReminder: next })}
            />
          </li>
          <li className="settings__row settings__row--last">
            <button type="button" className="settings__logout" onClick={() => setConfirmOpen(true)}>
              Cerrar sesión
            </button>
          </li>
        </ul>
      </section>

      <ConfirmSheet
        open={confirmOpen}
        title="¿Cerrar sesión?"
        message="Tendrás que volver a ingresar con tu correo y contraseña."
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        onConfirm={confirmLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </main>
  );
}
