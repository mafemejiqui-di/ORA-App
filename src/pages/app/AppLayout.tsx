import { Outlet } from "react-router-dom";
import { BottomNav } from "../../components/BottomNav";

/** Marco de las cuatro pestañas principales: contenido + barra de navegación flotante. */
export function AppLayout() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}
