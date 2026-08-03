import { BrowserRouter, Routes, Route } from "react-router-dom";

import ShowroomPage from "./pages/ShowroomPage";
import RecommendPage from "./pages/RecommendPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<ShowroomPage />} />

        <Route path="/recommend" element={<RecommendPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;