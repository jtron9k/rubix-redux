import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from './LandingPage';

/** Every URL is content-driven, so there is one catch-all route. */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
