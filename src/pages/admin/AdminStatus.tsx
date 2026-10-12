import type { AsyncState } from "../../utils/useAsync";
import "./Admin.css";

/** Pantalla de la administradora mientras llegan los datos, o si fallaron. */
export function AdminStatus({ title, state }: { title: string; state: AsyncState<unknown> }) {
  return (
    <main className="admin">
      <header className="admin__header">
        <h1 className="admin__title">{title}</h1>
      </header>
      <section className="admin__section">
        {state.error ? (
          <p className="admin__empty">
            No pudimos cargar los datos.{" "}
            <button type="button" className="admin__retry" onClick={state.reload}>
              Reintentar
            </button>
          </p>
        ) : (
          <p className="admin__caption">Cargando…</p>
        )}
      </section>
    </main>
  );
}
