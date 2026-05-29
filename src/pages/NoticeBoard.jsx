import { Megaphone, Pin, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

export default function NoticeBoard() {
  const { member, isCommittee } = useAuth();
  const [notices, setNotices] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", isPinned: false });

  useEffect(() => {
    const noticesQuery = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    return onSnapshot(noticesQuery, (snapshot) => {
      setNotices(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    await addDoc(collection(db, "notices"), {
      title: form.title.trim(),
      body: form.body.trim(),
      isPinned: form.isPinned,
      visibility: "members",
      createdBy: member.uid,
      createdByName: member.fullName || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setForm({ title: "", body: "", isPinned: false });
    setOpen(false);
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Notice Board</h1>
            <p className="mt-2 text-sm text-slate-600">
              Official announcements for Mayabon Poribar members.
            </p>
          </div>
          {isCommittee && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Plus size={18} />
              Create New
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4">
          {notices.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No notices have been published yet.
            </div>
          )}
          {notices.map((notice) => (
            <article key={notice.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <Megaphone size={22} className="mt-1 text-emerald-700" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">{notice.title}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {notice.body}
                    </p>
                  </div>
                </div>
                {notice.isPinned && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
                    <Pin size={13} />
                    Pinned
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <form onSubmit={handleCreate} className="w-full max-w-lg rounded-md bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">Create Notice</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-slate-100" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <input
                required
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Notice title"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
              <textarea
                required
                rows={6}
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                placeholder="Notice details"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={(event) => setForm((current) => ({ ...current, isPinned: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700"
                />
                Pin this notice
              </label>
            </div>
            <button type="submit" className="mt-5 w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              Publish Notice
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
