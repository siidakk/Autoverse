import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

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
import { LEGACY } from "./data/navigation";

// The sections were renamed to say what they do rather than how they work, so
// every old address has to keep working. A plain <Navigate> would drop the
// query string, and the query string is where a shared build code lives -- so
// every build anyone had ever sent to a friend would open an empty
// configurator. This carries it across.
function Moved({ to }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>

            <Route path="/" element={<HomePage />} />

            <Route path="/customise" element={<ShowroomPage />} />
            <Route path="/discover" element={<RecommendPage />} />
            <Route path="/value" element={<ValuationPage />} />
            <Route path="/identify" element={<DetectPage />} />
            <Route path="/repair" element={<DamagePage />} />

            <Route path="/account" element={<AccountPage />} />
            <Route path="/garage" element={<GaragePage />} />

            {LEGACY.map(({ from, to }) => (
              <Route key={from} path={from} element={<Moved to={to} />} />
            ))}

            <Route path="*" element={<Navigate to="/" replace />} />

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
