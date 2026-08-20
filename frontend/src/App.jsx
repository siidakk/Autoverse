import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import SiteLayout from "./components/layout/SiteLayout";
import HomePage from "./pages/HomePage";
import ShowroomPage from "./pages/ShowroomPage";
import RecommendPage from "./pages/RecommendPage";
import ValuationPage from "./pages/ValuationPage";
import DetectPage from "./pages/DetectPage";
import DamagePage from "./pages/DamagePage";
import AccountPage from "./pages/AccountPage";
import GaragePage from "./pages/GaragePage";
import { AuthProvider } from "./lib/auth";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>

          <Route path="/" element={<HomePage />} />

          <Route path="/configure" element={<ShowroomPage />} />

          <Route path="/recommend" element={<RecommendPage />} />

          <Route path="/value" element={<ValuationPage />} />

          <Route path="/detect" element={<DetectPage />} />

          <Route path="/damage" element={<DamagePage />} />

          <Route path="/account" element={<AccountPage />} />

          <Route path="/garage" element={<GaragePage />} />

          {/* The configurator used to live at the root */}
          <Route path="/showroom" element={<Navigate to="/configure" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />

        </Route>
      </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
