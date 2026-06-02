import { useState } from "react";
import { Loader2, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { USER_ROLE_LABELS, USER_ROLES } from "../context/AuthContext";

export default function AdminMemberAdd() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "general_member",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const email = form.email.trim().toLowerCase();

    try {
      // 1. Check if member already exists
      const q = query(collection(db, "members"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        throw new Error("A member with this email already exists.");
      }

      // 2. Generate a temporary ID (will be linked to UID on their first login)
      const tempId = "direct_" + Date.now();

      const memberData = {
        uid: tempId,
        memberId: tempId,
        fullName: form.fullName.trim(),
        email: email,
        phone: form.phone.trim(),
        role: form.role,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        addedDirectly: true,
      };

      await setDoc(doc(db, "members", tempId), memberData);

      setSuccess(true);
      setForm({ fullName: "", email: "", phone: "", role: "general_member" });
      
      // Auto redirect back after 2 seconds
      setTimeout(() => {
        navigate("/admin/members");
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-emerald-100 p-2">
            <UserPlus size={24} className="text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950">Direct Add Member</h1>
            <p className="text-sm text-slate-600">Add a member directly without a voting session.</p>
          </div>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-md bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-center gap-2 rounded-md bg-emerald-50 p-4 text-sm text-emerald-800 font-semibold">
            <CheckCircle2 size={18} />
            Member added successfully! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Full Name</label>
            <input
              required
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Full name of the member"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Email Address</label>
              <input
                required
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Phone Number</label>
              <input
                required
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+880..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Assign Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 bg-white"
          >
            {Object.entries(USER_ROLES).map(([key, value]) => (
              <option key={key} value={value}>
                {USER_ROLE_LABELS[value] || key.replace("_", " ").charAt(0).toUpperCase() + key.replace("_", " ").slice(1)}
              </option>
            ))}
          </select>
          </div>

          <div className="mt-8 flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate("/admin/members")}
              className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition disabled:bg-slate-400"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {loading ? "Adding Member..." : "Add Member Directly"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
