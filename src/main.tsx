import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initPWA } from "./pwa";
import { StoreProvider } from "./store";
import "./index.css";

initPWA();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
