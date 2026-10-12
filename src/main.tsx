import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/400-italic.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/500-italic.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "./styles/tokens.css";
import "./styles/global.css";
import { App } from "./App";
import { registerServiceWorker } from "./lib/push";

// Necesario para recibir el recordatorio diario como notificación del celular.
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
