import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";
import CreateSecretPage from "./pages/CreateSecretPage";
import ViewSecretPage from "./pages/ViewSecretPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateSecretPage />} />
        <Route path="/secret/:shareId" element={<ViewSecretPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
