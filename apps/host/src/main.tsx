import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { markTrustedShell } from "@mfe/trusted-shell";
// Side-effect import, deliberately first: captures window.fetch before any
// remote can possibly load and monkey-patch it. See ./security/nativeFetch.ts.
import "./security/nativeFetch";
import App from "./App";
import "./index.css";

markTrustedShell();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
