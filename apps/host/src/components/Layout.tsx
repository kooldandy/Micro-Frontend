import { NavLink, Outlet } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `host-px-3 host-py-2 host-rounded host-text-sm host-font-medium ${
    isActive ? "host-bg-slate-900 host-text-white" : "host-text-slate-600 hover:host-bg-slate-100"
  }`;

export default function Layout() {
  const { userId, cartCount } = useAppSelector((state) => state.ui);

  return (
    <div className="host-min-h-screen host-bg-slate-50">
      <header className="host-border-b host-border-slate-200 host-bg-white">
        <nav className="host-max-w-5xl host-mx-auto host-px-6 host-py-3 host-flex host-items-center host-justify-between">
          <div className="host-flex host-items-center host-gap-2">
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/auth/login" className={linkClass}>
              Auth
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              Profile
            </NavLink>
            <NavLink to="/product" className={linkClass}>
              Product
            </NavLink>
          </div>
          <div className="host-text-sm host-text-slate-500 host-flex host-items-center host-gap-4">
            <span>{userId ? `Signed in: ${userId}` : "Not signed in"}</span>
            <span>Cart: {cartCount}</span>
          </div>
        </nav>
      </header>
      <main className="host-max-w-5xl host-mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
