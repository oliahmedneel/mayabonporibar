import { Loader2, ShieldCheck, UserCog, UserMinus, UserPlus, Search, Edit3, X, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, updateDoc, query, orderBy } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../config/firebase";
import { USER_ROLE_LABELS, USER_ROLES } from "../context/AuthContext";

const STATUS_OPTIONS = ["active", "inactive", "pending"];

export default function MemberManagement() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  
  // Edit modal state
  const [editingMember, setEditingMember] = useState(null);
  const [contributionText, setContributionText] = useState("");

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
      if (editingMember && editingMember.id === uid) {
        setEditingMember(null);
      }
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
            to="/admin/addmember"
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
                          {USER_ROLE_LABELS[value] || key.replace("_", " ")}
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        title="Edit Contribution"
                        onClick={() => {
                          setEditingMember(m);
                          setContributionText(m.contribution || m.contributions || "");
                        }}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition"
                      >
                        <Edit3 size={18} />
                      </button>
                      {updatingId === m.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Contribution Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Edit Contribution</h2>
              <button
                onClick={() => setEditingMember(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-700">Member: {editingMember.fullName}</p>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-semibold text-slate-600">
                  Community Contribution Detail
                </label>
                <textarea
                  className="min-h-[150px] w-full rounded-md border border-slate-300 p-3 text-sm text-slate-700 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  placeholder="Describe this member's contributions to Mayabon Poribar..."
                  value={contributionText}
                  onChange={(e) => setContributionText(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                disabled={updatingId === editingMember.id}
                onClick={() => updateMember(editingMember.id, { contribution: contributionText })}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition disabled:opacity-50"
              >
                {updatingId === editingMember.id ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Changes
              </button>
              <button
                disabled={updatingId === editingMember.id}
                onClick={() => setEditingMember(null)}
                className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

