import { useEffect, useState } from "react";
import { Loader2, LogIn, KeyRound, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { sendSignInLinkToEmail } from "firebase/auth";

export default function Login() {
  const navigate = useNavigate();
  const {
    login,
    loginWithGoogle,
    loading,
    authError,
    isAuthenticated,
    isActiveMember,
  } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  // Activation states
  const [isActivating, setIsActivating] = useState(false);
  const [activationEmail, setActivationEmail] = useState("");
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationMessage, setActivationMessage] = useState("");
  const [activationError, setActivationError] = useState("");

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
    } catch (error) {
      // Error is handled by AuthContext
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleSubmitting(true);
    try {
      await loginWithGoogle();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      // Error is handled by AuthContext
    } finally {
      setGoogleSubmitting(false);
    }
  }

  async function handleSendActivationLink(event) {
    event.preventDefault();
    setActivationLoading(true);
    setActivationError("");
    setActivationMessage("");

    const email = activationEmail.trim().toLowerCase();

    try {
      // 1. Check if the user exists in members collection
      const q = query(collection(db, "members"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("আপনার ইমেইলটি নিবন্ধিত মেম্বার হিসেবে পাওয়া যায়নি। দয়া করে অ্যাডমিনের সাথে যোগাযোগ করুন।");
      }

      const memberDoc = querySnapshot.docs[0];
      const memberData = memberDoc.data();

      if (memberData.status !== "active") {
        throw new Error("আপনার মেম্বারশিপ অ্যাকাউন্টটি সক্রিয় নয়।");
      }

      // 2. Send sign in link to email
      const actionCodeSettings = {
        url: `${window.location.origin}${import.meta.env.BASE_URL}#/complete-signup?email=${encodeURIComponent(email)}&memberName=${encodeURIComponent(memberData.fullName || "")}`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      setActivationMessage("✅ একটি অ্যাক্টিভেশন লিংক আপনার ইমেইলে পাঠানো হয়েছে। আপনার ইমেইল চেক করুন এবং পাসওয়ার্ড সেট করুন।");
      setActivationEmail("");
    } catch (err) {
      setActivationError(err.message);
    } finally {
      setActivationLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-slate-50 px-4 py-10">
      {isActivating ? (
        <form
          onSubmit={handleSendActivationLink}
          className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm"
        >
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
            Mayabon Poribar
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">
            Activate Account
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            যদি অ্যাডমিন আপনার অ্যাকাউন্ট তৈরি করে থাকেন, তবে এখানে ইমেইল দিয়ে অ্যাক্টিভেশন লিংক রিকোয়েস্ট করুন।
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Email Address
              </label>
              <input
                required
                type="email"
                value={activationEmail}
                onChange={(e) => setActivationEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {activationError && (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {activationError}
            </p>
          )}

          {activationMessage && (
            <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
              {activationMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={activationLoading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {activationLoading ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
            {activationLoading ? "Sending Link..." : "Send Activation Link"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsActivating(false);
              setActivationError("");
              setActivationMessage("");
            }}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to Login
          </button>
        </form>
      ) : (
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
            disabled={loading || submitting || googleSubmitting}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {submitting ? "Signing in..." : "Sign In"}
          </button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsActivating(true);
                setActivationError("");
                setActivationMessage("");
              }}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              New Member? Activate your account here (অ্যাকাউন্ট সক্রিয় করুন)
            </button>
          </div>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading || submitting || googleSubmitting}
            onClick={handleGoogleLogin}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
          >
            {googleSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {googleSubmitting ? "Connecting..." : "Sign in with Google"}
          </button>
        </form>
      )}
    </main>
  );
}
