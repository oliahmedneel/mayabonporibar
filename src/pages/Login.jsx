import { useEffect, useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const {
    login,
    loading,
    authError,
    isAuthenticated,
    isActiveMember,
  } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && isActiveMember) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, isAuthenticated, isActiveMember, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      await login(formData.get("email"), formData.get("password"));
      navigate("/dashboard", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-slate-50 px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm"
      >
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
          Mayabon Poribar
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">
          Member Login
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Sign in to access the member dashboard, chat, voting, notices, events,
          and gallery.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Your password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {authError && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {authError.message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
