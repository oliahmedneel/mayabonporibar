import { Loader2, Plus, Search, Trash2, MoveUp, MoveDown, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, updateDoc, query, orderBy, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export default function CommitteeManagement() {
  const [members, setMembers] = useState([]);
  const [committee, setCommittee] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    // Load all active members to choose from
    const membersQuery = query(collection(db, "members"), orderBy("fullName", "asc"));
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Load current committee
    const committeeQuery = query(collection(db, "executiveCommittee"), orderBy("order", "asc"));
    const unsubscribeCommittee = onSnapshot(committeeQuery, (snapshot) => {
      setCommittee(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeCommittee();
    };
  }, []);

  async function addToCommittee(member) {
    const order = committee.length > 0 ? Math.max(...committee.map(c => c.order || 0)) + 1 : 0;
    try {
      await setDoc(doc(db, "executiveCommittee", member.id), {
        fullName: member.fullName,
        banglaName: member.banglaName || "",
        photoURL: member.photoURL || "",
        designation: "Committee Member",
        order: order,
        isActive: true,
        tenure: "2024-2025"
      });
    } catch (err) {
      alert("Error adding to committee: " + err.message);
    }
  }

  async function removeFromCommittee(id) {
    if (!confirm("Remove this member from the committee?")) return;
    try {
      await deleteDoc(doc(db, "executiveCommittee", id));
    } catch (err) {
      alert("Error removing: " + err.message);
    }
  }

  async function updateField(id, field, value) {
    try {
      await updateDoc(doc(db, "executiveCommittee", id), { [field]: value });
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  }

  async function moveOrder(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= committee.length) return;

    const item1 = committee[index];
    const item2 = committee[newIndex];

    try {
      await updateDoc(doc(db, "executiveCommittee", item1.id), { order: item2.order });
      await updateDoc(doc(db, "executiveCommittee", item2.id), { order: item1.order });
    } catch (err) {
      alert("Reordering failed");
    }
  }

  const availableMembers = members.filter(m => 
    !committee.find(c => c.id === m.id) &&
    (m.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     m.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left: Active Committee Management */}
        <section>
          <h1 className="text-2xl font-bold text-slate-900">Manage Committee</h1>
          <p className="text-sm text-slate-600">Assign designations and set display order.</p>

          <div className="mt-6 space-y-4">
            {committee.map((person, index) => (
              <div key={person.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <img src={person.photoURL || "/default-avatar.svg"} className="h-12 w-12 rounded-full border object-cover" alt="" />
                
                <div className="flex-1 space-y-2">
                  <p className="font-bold text-slate-900">{person.fullName}</p>
                  <div className="flex flex-wrap gap-2">
                    <input 
                      placeholder="Designation"
                      className="rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-emerald-600"
                      value={person.designation}
                      onChange={(e) => updateField(person.id, "designation", e.target.value)}
                    />
                    <input 
                      placeholder="Tenure"
                      className="rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-emerald-600"
                      value={person.tenure}
                      onChange={(e) => updateField(person.id, "tenure", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => moveOrder(index, -1)} disabled={index === 0} className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-30"><MoveUp size={18} /></button>
                  <button onClick={() => moveOrder(index, 1)} disabled={index === committee.length - 1} className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-30"><MoveDown size={18} /></button>
                  <button onClick={() => removeFromCommittee(person.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Add Members Sidebar */}
        <aside className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <h2 className="font-bold text-slate-900">Add to Committee</h2>
          <div className="relative mt-4">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              placeholder="Search members..."
              className="w-full rounded border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-emerald-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="mt-4 max-h-[500px] space-y-2 overflow-y-auto pr-1">
            {availableMembers.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-md bg-white p-2 shadow-sm">
                <span className="truncate text-xs font-medium text-slate-700">{m.fullName}</span>
                <button 
                  onClick={() => addToCommittee(m)}
                  className="rounded-full p-1 text-emerald-600 hover:bg-emerald-50"
                  title="Add to Committee"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
