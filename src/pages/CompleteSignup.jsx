import { KeyRound, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, db } from "../config/firebase";
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword,
} from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export default function CompleteSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [memberName, setMemberName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("verify"); // verify | set-password | done

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const nameParam = searchParams.get("memberName");
    const storedEmail = window.localStorage.getItem("emailForSignIn");

    if (emailParam) setEmail(decodeURIComponent(emailParam));
    else if (storedEmail) setEmail(storedEmail);

    if (nameParam) setMemberName(decodeURIComponent(nameParam));

    if (isSignInWithEmailLink(auth, window.location.href)) {
      setMode("verify");
    } else {
      setError("Invalid or expired link. Please request a new sign-in link from an admin.");
    }
    setLoading(false);
  }, [searchParams]);

  async function handleVerifyAndSignIn() {
    if (!email) {
      setError("No email address found.");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      // Sign in with the email link — this also creates the Auth record if new
      const result = await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem("emailForSignIn");

      setMode("set-password");
      setMessage(`Welcome${memberName ? `, ${memberName}` : ""}! Please set your password below.`);
    } catch (err) {
      if (err.code === "auth/invalid-action-code") {
        setError("This link has expired or already been used. Please ask an admin to send a new link.");
      } else {
        setError(err.message);
      }
    } finally {
      setProcessing(false);
    }
  }

  async function handleSetPassword(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setProcessing(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("Session expired. Please reload using the link from your email.");
        setProcessing(false);
        return;
      }

      // Set the password on the existing Auth record
      await updatePassword(currentUser, password);

      // Update Firestore member document
      await updateDoc(doc(db, "members", currentUser.uid), {
        emailVerified: true,
        authMethod: "email_password",
        updatedAt: serverTimestamp(),
      });

      setMode("done");
      setMessage("Password set successfully! You are now signed in.");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        setError("Session too old. Please reload the page using the email link again.");
      } else {
        setError(err.message);
      }
    } finally {
      setProcessing(false);
    }
  }

  async function handleGoToDashboard() {
    navigate("/dashboard");
  }

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <Loader2 size={22} className="animate-spin text-emerald-700" />
          <p className="text-sm font-semibold text-slate-700">Verifying your link...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-emerald-100 p-2">
            <KeyRound size={24} className="text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950">Complete Registration</h1>
            <p className="text-sm text-slate-600">
              {memberName ? `Hi ${memberName}!` : ""} Set up your account to access Mayabon Poribar.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {mode === "verify" && (
          <div className="mt-6">
            <p className="mb-4 text-sm text-slate-600">
              Click the button below to verify your email and sign in.
            </p>
            {email && (
              <p className="mb-4 rounded-md bg-slate-50 p-2 text-sm font-medium text-slate-700">
                ✉️ {email}
              </p>
            )}
            <button
              type="button"
              disabled={processing || !email}
              onClick={handleVerifyAndSignIn}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {processing ? <Loader2 size={18} className="animate-spin" /> : null}
              {processing ? "Verifying..." : "Verify & Sign In"}
            </button>
          </div>
        )}

        {mode === "set-password" && (
          <form onSubmit={handleSetPassword} className="mt-6 space-y-4">
            {message && (
              <p className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                {message}
              </p>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {processing ? <Loader2 size={18} className="animate-spin" /> : null}
              {processing ? "Setting Up..." : "Set Password & Continue"}
            </button>
          </form>
        )}

        {mode === "done" && (
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 size={32} className="text-emerald-700" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-950">Welcome to Mayabon Poribar!</h2>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
            <button
              type="button"
              onClick={handleGoToDashboard}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </main>
  );
}