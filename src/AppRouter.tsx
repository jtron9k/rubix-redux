import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from './LandingPage';

// Dev only: import.meta.env.DEV is false in production builds, so the wizard is tree-shaken and /setup 404s.
const SetupWizard = import.meta.env.DEV ? lazy(() => import('./setup/SetupWizard')) : null;

/** Every URL is content-driven, so there is one catch-all route (plus /setup in dev). */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {SetupWizard && (
          <Route
            path="/setup"
            element={
              <Suspense fallback={null}>
                <SetupWizard />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
