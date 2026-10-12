import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

/** Envuelve las rutas que solo puede ver quien tiene sesión. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  // Mientras se recupera la sesión guardada no se redirige (la cubre el Splash).
  if (loading) return null;
  return user ? <Outlet /> : <Navigate to="/" replace />;
}
