import { Loader2, ShieldCheck, UserCog, UserMinus, UserPlus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, updateDoc, query, orderBy } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../config/firebase";
import { USER_ROLES } from "../context/AuthContext";

const STATUS_OPTIONS = ["active", "inactive", "pending"];

export default function MemberManagement() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "members"), orderBy("fullName", "asc"));
    return onSnapshot(
      q,
      (snapshot) => {
        setMembers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, []);

  async function updateMember(uid, data) {
    setUpdatingId(uid);
    try {
      await updateDoc(doc(db, "members", uid), data);
    } catch (err) {
      alert("Failed to update member: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredMembers = members.filter((m) =>
    m.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Member Management</h1>
          <p className="text-sm text-slate-600">Change user roles and manage membership status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/members/add"
            className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            <UserPlus size={18} />
            Add New Member
          </Link>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-emerald-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Current Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={m.photoURL || "/default-avatar.svg"}
                        className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                        alt=""
                      />
                      <div>
                        <div className="font-bold text-slate-900">{m.fullName}</div>
                        <div className="text-xs text-slate-500">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      disabled={updatingId === m.id}
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-600"
                      value={m.role || "visitor"}
                      onChange={(e) => updateMember(m.id, { role: e.target.value })}
                    >
                      {Object.entries(USER_ROLES).map(([key, value]) => (
                        <option key={key} value={value}>
                          {key.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      disabled={updatingId === m.id}
                      className={`rounded border border-slate-200 px-2 py-1 text-xs font-semibold outline-none focus:border-emerald-600 ${
                        m.status === "active" ? "text-emerald-700" : "text-amber-700"
                      }`}
                      value={m.status || "pending"}
                      onChange={(e) => updateMember(m.id, { status: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {updatingId === m.id ? (
                      <Loader2 className="ml-auto h-4 w-4 animate-spin text-emerald-600" />
                    ) : (
                      <span className="text-slate-400">---</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
