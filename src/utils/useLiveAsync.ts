import { useEffect, useRef, type DependencyList } from "react";
import { subscribeTeamActivity } from "../data/api";
import { useAsync, type AsyncState } from "./useAsync";

/** Espera tras el aviso de actividad: varias respuestas seguidas se juntan en una sola recarga. */
const DEBOUNCE_MS = 600;

/**
 * Igual que useAsync, pero se actualiza solo cuando hay actividad nueva en el equipo
 * (Supabase Realtime) y al volver a la app. `teamId` null = escuchar todos los equipos
 * (administradora); undefined = no escuchar.
 */
export function useLiveAsync<T>(load: () => Promise<T>, deps: DependencyList, teamId: string | null | undefined): AsyncState<T> {
  const state = useAsync(load, deps);
  const reload = useRef(state.reload);
  reload.current = state.reload;

  useEffect(() => {
    if (teamId === undefined) return;
    let timer = 0;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => reload.current(), DEBOUNCE_MS);
    };
    const unsubscribe = subscribeTeamActivity(teamId, refresh);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [teamId]);

  return state;
}
