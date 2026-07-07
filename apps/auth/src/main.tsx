import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { markTrustedShell } from "@mfe/trusted-shell";
import App from "./App";
import "./index.css";

// Standalone entry point — used only when running `yarn dev` / `yarn preview`
// directly inside apps/auth for isolated development. The host never loads
// this file; it loads the federated ./App export instead.
//
// markTrustedShell() here (not just in the host) is what lets this app pass
// its own Tier 3 handshake check when run standalone — see
// docs/07-security-architecture.md.
markTrustedShell();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
