import { useCallback, useEffect, useState, type DependencyList } from "react";

export type AsyncState<T> = {
  data: T | null;
  error: unknown;
  loading: boolean;
  /** Vuelve a pedir los datos (p. ej. tras un error). */
  reload: () => void;
};

/** Pide datos al servidor al montar la pantalla (y cuando cambian `deps`). */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setState] = useState<{ data: T | null; error: unknown; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((prev) => ({ ...prev, error: null, loading: true }));
    load().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (error: unknown) => alive && setState({ data: null, error, loading: false }),
    );
    return () => {
      alive = false;
    };
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
