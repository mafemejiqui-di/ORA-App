import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { Splash } from "./components/Splash";
import { ToastProvider } from "./components/Toast";
import { AccountCreated } from "./pages/AccountCreated";
import { AppLayout } from "./pages/app/AppLayout";
import { Cycle } from "./pages/app/cycle/Cycle";
import { Home } from "./pages/app/home/Home";
import { Profile } from "./pages/app/profile/Profile";
import { Team } from "./pages/app/team/Team";
import { Closing } from "./pages/closing/Closing";
import { Decision } from "./pages/decision/Decision";
import { Diagnosis } from "./pages/diagnosis/Diagnosis";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { RitualDiario } from "./pages/ritual/RitualDiario";
import { RegisterStep1 } from "./pages/register/RegisterStep1";
import { RegisterStep2 } from "./pages/register/RegisterStep2";
import { RegisterStep3 } from "./pages/register/RegisterStep3";
import { TotemDone } from "./pages/totem/TotemDone";
import { TotemIntro } from "./pages/totem/TotemIntro";
import { TotemQuestion1, TotemQuestion2, TotemQuestion3 } from "./pages/totem/TotemQuestions";
import { InstallGuide } from "./pages/install/InstallGuide";
import { AuthProvider } from "./state/AuthContext";
import { isBrowserPreview, isInstalledApp } from "./utils/install";
import { RegistrationProvider } from "./state/RegistrationContext";
import { TotemDraftProvider } from "./state/TotemContext";

/**
 * Desde el navegador se ve el instructivo para instalar ORA; desde el ícono instalado, la app.
 * Para revisar la app en el navegador sin instalarla: abrir una vez con ?vista=app (y ?vista=instructivo para volver).
 */
const SHOW_INSTALL_GUIDE = !isInstalledApp() && !isBrowserPreview();

export function App() {
  return (
    <AuthProvider>
      <RegistrationProvider>
        <TotemDraftProvider>
          <ToastProvider>
            {SHOW_INSTALL_GUIDE ? (
              <div className="app-shell app-shell--white">
                <InstallGuide />
              </div>
            ) : (
            <BrowserRouter>
              <Splash />
              <div className="app-shell">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/iniciar-sesion" element={<Login />} />
                  <Route path="/registro/1" element={<RegisterStep1 />} />
                  <Route path="/registro/2" element={<RegisterStep2 />} />
                  <Route path="/registro/3" element={<RegisterStep3 />} />
                  <Route path="/cuenta-creada" element={<AccountCreated />} />

                  <Route element={<RequireAuth />}>
                    <Route path="/totem" element={<TotemIntro />} />
                    <Route path="/totem/1" element={<TotemQuestion1 />} />
                    <Route path="/totem/2" element={<TotemQuestion2 />} />
                    <Route path="/totem/3" element={<TotemQuestion3 />} />
                    <Route path="/totem/listo" element={<TotemDone />} />

                    <Route element={<AppLayout />}>
                      <Route path="/inicio" element={<Home />} />
                      <Route path="/ciclo" element={<Cycle />} />
                      <Route path="/equipo" element={<Team />} />
                      <Route path="/perfil" element={<Profile />} />
                    </Route>
                    {/* El historial vive ahora en la pantalla Ciclo. */}
                    <Route path="/historial" element={<Navigate to="/ciclo" replace />} />
                    <Route path="/ritual" element={<RitualDiario />} />

                    {/* Flujos del ciclo: se construyen en la fase 4. */}
                    <Route path="/ciclo/diagnostico" element={<Diagnosis />} />
                    <Route path="/decision" element={<Decision />} />
                    <Route path="/ciclo/cierre" element={<Closing />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </BrowserRouter>
            )}
          </ToastProvider>
        </TotemDraftProvider>
      </RegistrationProvider>
    </AuthProvider>
  );
}
