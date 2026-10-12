import type { CSSProperties } from "react";
import { NavLink, useLocation } from "react-router-dom";
import calendarIcon from "../assets/icons/nav-calendar.svg";
import homeIcon from "../assets/icons/nav-home.svg";
import userIcon from "../assets/icons/nav-user.svg";
import usersIcon from "../assets/icons/nav-users.svg";
import "./BottomNav.css";

const ITEMS = [
  { to: "/inicio", label: "Inicio", icon: homeIcon },
  { to: "/ciclo", label: "Ciclo", icon: calendarIcon },
  { to: "/equipo", label: "Equipo", icon: usersIcon },
  { to: "/perfil", label: "Perfil", icon: userIcon },
];

/**
 * Barra flotante de navegación. La pestaña activa sube a una burbuja que se asienta
 * en una muesca de la barra; burbuja y muesca se deslizan juntas al cambiar de pestaña.
 */
export function BottomNav() {
  const { pathname } = useLocation();
  const activeIndex = ITEMS.findIndex((item) => pathname.startsWith(item.to));
  const hasActive = activeIndex >= 0;

  return (
    <nav
      className={hasActive ? "bottom-nav has-active" : "bottom-nav"}
      aria-label="Navegación principal"
      style={{ "--nav-index": Math.max(activeIndex, 0), "--nav-count": ITEMS.length } as CSSProperties}
    >
      <span className="bottom-nav__bg" aria-hidden="true" />
      <span className="bottom-nav__bubble" aria-hidden="true" />
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => (isActive ? "bottom-nav__item is-active" : "bottom-nav__item")}
          // Solo ícono: el nombre queda para lectores de pantalla y como tooltip.
          aria-label={item.label}
          title={item.label}
        >
          {/* El ícono de Figma se usa como máscara para poder teñirlo según el estado. */}
          <span
            className="bottom-nav__icon"
            aria-hidden="true"
            style={{ WebkitMaskImage: `url(${item.icon})`, maskImage: `url(${item.icon})` }}
          />
        </NavLink>
      ))}
    </nav>
  );
}
