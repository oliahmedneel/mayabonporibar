import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

const initialForm = {
  fullName: "",
  email: "",
  bio: "",
  phone: "",
  socialLink: "",
};

export default function ApplyPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      await addDoc(collection(db, "applications"), {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        bio: form.bio.trim(),
        phone: form.phone.trim(),
        socialLink: form.socialLink.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setForm(initialForm);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-md border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
            Mayabon Poribar
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
            New Member Application
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Share your basic details with the executive committee. Once reviewed,
            your application can be moved into an anonymous community voting
            session.
          </p>
          <div className="mt-6 rounded-md bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            Applications are saved as pending until an admin or executive starts
            a voting session.
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-md border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Full Name
              </label>
              <input
                required
                name="fullName"
                value={form.fullName}
                onChange={updateField}
                placeholder="Your full name"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  required
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Phone Number
                </label>
                <input
                  required
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={updateField}
                  placeholder="+880..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Brief Bio
              </label>
              <textarea
                required
                rows={5}
                name="bio"
                value={form.bio}
                onChange={updateField}
                placeholder="Tell us briefly about yourself"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Social Media Link
              </label>
              <input
                type="url"
                name="socialLink"
                value={form.socialLink}
                onChange={updateField}
                placeholder="Facebook, LinkedIn, or personal website"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              <CheckCircle2 size={18} />
              Application submitted successfully.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Send size={18} />
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </main>
  );
}
