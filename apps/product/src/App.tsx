import { Provider } from "react-redux";
import { Route, Routes } from "react-router-dom";
import { TrustedShellGate } from "@mfe/trusted-shell";
import { store } from "./store/store";
import ProductListPage from "./pages/ProductListPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import "./index.css";

// Federation exposes entry ("./App"). No <BrowserRouter> here — see
// docs/03-routing-blueprint.md and apps/auth/src/App.tsx for the pattern.
// <TrustedShellGate> is the Tier 3 handshake — see docs/07-security-architecture.md.
export default function App() {
  return (
    <TrustedShellGate>
      <Provider store={store}>
        <div className="product-p-4">
          <Routes>
            <Route index element={<ProductListPage />} />
            <Route path=":productId" element={<ProductDetailPage />} />
          </Routes>
        </div>
      </Provider>
    </TrustedShellGate>
  );
}
