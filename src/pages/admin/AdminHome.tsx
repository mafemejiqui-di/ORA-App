import { useState } from "react";
import download from "../../assets/icons/download.svg";
import { Avatar } from "../../components/Avatar";
import { useToast } from "../../components/Toast";
import { getGeneration } from "../../data/catalogs";
import { getAdminSnapshot, type AdminSnapshot } from "../../data/api";
import { getUsageReport, INACTIVE_ALERT_DAYS } from "../../utils/teamInsights";
import { useLiveAsync } from "../../utils/useLiveAsync";
import { AdminStatus } from "./AdminStatus";
import { exportAppReport } from "./exportReport";
import { UsageChart } from "./UsageChart";
import "./Admin.css";

const inactiveText = (days: number | null) =>
  days === null ? "Sin usar la app en las últimas 2 semanas" : `Sin usar la app hace ${days} días`;

/** Inicio de la administradora: equipos conectados, uso diario y alertas. */
export function AdminHome() {
  const snapshot = useLiveAsync(getAdminSnapshot, [], null);
  if (!snapshot.data) return <AdminStatus title="Hola, Administradora" state={snapshot} />;
  return <AdminHomeView snapshot={snapshot.data} />;
}

function AdminHomeView({ snapshot }: { snapshot: AdminSnapshot }) {
  const { teams } = snapshot;
  const report = getUsageReport(snapshot, teams);
  const inactiveById = new Map(report.alerts.map((a) => [a.member.id, a.daysInactive]));
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  async function exportReport() {
    setExporting(true);
    try {
      await exportAppReport(snapshot);
      showToast("Informe descargado", "primary");
    } catch {
      showToast("No pudimos generar el informe. Inténtalo de nuevo.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Hola, Administradora</h1>
        <p className="admin__sub">Vista general de los equipos</p>
      </header>

      <section className="admin__section" aria-label="Resumen">
        <div className="admin-stats">
          <div className="admin-stat">
            <span className="admin-stat__value">{teams.length}</span>
            <span className="admin-stat__label">Equipos conectados</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat__value">{report.members}</span>
            <span className="admin-stat__label">Integrantes</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat__value">{report.activeToday}</span>
            <span className="admin-stat__label">Usaron la app hoy</span>
          </div>
        </div>
        <button type="button" className="admin__export" onClick={() => void exportReport()} disabled={exporting}>
          <img src={download} width={16} height={16} alt="" />
          {exporting ? "Generando informe…" : "Exportar informe de la app"}
        </button>
      </section>

      <section className="admin__section" aria-labelledby="admin-teams-label">
        <h2 className="section-label" id="admin-teams-label">
          Equipos conectados
        </h2>
        <ul className="admin-teams">
          {teams.map((team) => {
            const members = snapshot.members[team.id] ?? [];
            return (
              <li key={team.id} className="admin__card">
                <div className="admin-team__head">
                  <h3 className="admin-team__name">{team.name}</h3>
                  <span className="admin-team__meta">
                    {members.length} {members.length === 1 ? "integrante" : "integrantes"} · {team.code}
                  </span>
                </div>
                {members.length === 0 ? (
                  <p className="admin__caption">Aún no tiene integrantes.</p>
                ) : (
                  <ul className="admin-members">
                    {members.map((member) => {
                      const inactive = inactiveById.get(member.id);
                      const role = [member.role, getGeneration(member.generation)?.compact].filter(Boolean).join(" · ");
                      return (
                        <li key={member.id} className="admin-member">
                          <Avatar name={member.name} />
                          <span className="admin-member__info">
                            <span className="admin-member__name">{member.name}</span>
                            <span className="admin-member__role">{role || "Sin rol ni generación"}</span>
                          </span>
                          {inactiveById.has(member.id) && (
                            <span className="admin-member__status is-alert">
                              ⚠ {inactive === null ? "Sin uso" : `${inactive} días`}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="admin__section" aria-labelledby="admin-usage-label">
        <h2 className="section-label" id="admin-usage-label">
          Uso diario de la app
        </h2>
        <p className="admin__caption">Una gráfica por equipo · últimos 14 días</p>
        <ul className="admin-teams">
          {teams.map((team) => {
            const teamReport = getUsageReport(snapshot, [team]);
            return (
              <li key={team.id} className="admin__card">
                <div className="admin-team__head">
                  <h3 className="admin-team__name">{team.name}</h3>
                  <span className="admin-team__meta">
                    {teamReport.activeToday} de {teamReport.members} usaron la app hoy
                  </span>
                </div>
                {teamReport.members === 0 ? (
                  <p className="admin__caption admin__caption--inline">Aún no tiene integrantes.</p>
                ) : (
                  <UsageChart days={teamReport.days} />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="admin__section" aria-labelledby="admin-alerts-label">
        <h2 className="section-label" id="admin-alerts-label">
          Alertas
        </h2>
        <p className="admin__caption">Integrantes con {INACTIVE_ALERT_DAYS} días o más sin usar la app</p>
        {report.alerts.length === 0 ? (
          <p className="admin__empty">Todos los integrantes usaron la app en los últimos días.</p>
        ) : (
          <ul className="admin-alerts">
            {report.alerts.map((alert) => (
              <li key={alert.member.id} className="admin-alert">
                <span className="admin-alert__icon" aria-hidden="true">
                  ⚠
                </span>
                <span className="admin-alert__text">
                  {alert.member.name}
                  <span className="admin-alert__detail">
                    {alert.team.name} · {inactiveText(alert.daysInactive)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

    </main>
  );
}
