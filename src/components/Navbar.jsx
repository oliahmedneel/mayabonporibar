import {
  CalendarDays,
  Image,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Shield,
  Users,
  Vote,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const visitorLinks = [
  { to: "/", label: "Home" },
  { to: "/committee", label: "Committee" },
  { to: "/apply", label: "Apply" },
];

const memberLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/members", label: "Members", icon: Users },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/voting", label: "Voting", icon: Vote },
  { to: "/notices", label: "Notices", icon: Shield },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/gallery", label: "Gallery", icon: Image },
];

function navClass({ isActive }) {
  return `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-emerald-50 text-emerald-800"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
  }`;
}

export default function Navbar() {
  const { isAuthenticated, isActiveMember, isCommittee, displayName, logout } =
    useAuth();
  const [open, setOpen] = useState(false);

  const links = isAuthenticated && isActiveMember ? memberLinks : visitorLinks;

  async function handleLogout() {
    setOpen(false);
    await logout();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-sm font-bold text-white shadow-sm">
            MP
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">
              Mayabon Poribar
            </p>
            <p className="truncate text-xs text-slate-500">
              Community of care and connection
            </p>
          </div>
        </Link>

        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink key={link.to} to={link.to} className={navClass}>
                {Icon && <Icon size={16} />}
                {link.label}
              </NavLink>
            );
          })}

          {isCommittee && (
            <NavLink to="/admin" className={navClass}>
              <Shield size={16} />
              Admin
            </NavLink>
          )}
          {isCommittee && (
            <NavLink to="/admin/voting-creator" className={navClass}>
              <Vote size={16} />
              Start Vote
            </NavLink>
          )}

          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="ml-2 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <LogOut size={16} />
              Logout
            </button>
          ) : (
            <NavLink
              to="/login"
              className="ml-2 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              <LogIn size={16} />
              Login
            </NavLink>
          )}
        </div>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          {isAuthenticated && displayName && (
            <p className="mb-2 rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              Signed in as {displayName}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={navClass}
              >
                {link.icon && <link.icon size={16} />}
                {link.label}
              </NavLink>
            ))}
            {isCommittee && (
              <NavLink
                to="/admin"
                onClick={() => setOpen(false)}
                className={navClass}
              >
                <Shield size={16} />
                Admin
              </NavLink>
            )}
            {isCommittee && (
              <NavLink
                to="/admin/voting-creator"
                onClick={() => setOpen(false)}
                className={navClass}
              >
                <Vote size={16} />
                Start Vote
              </NavLink>
            )}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <LogOut size={16} />
                Logout
              </button>
            ) : (
              <NavLink
                to="/login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
              >
                <LogIn size={16} />
                Login
              </NavLink>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
