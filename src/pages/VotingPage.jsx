import { Check, Lock, Users, Vote, X, SquareX, UserPlus, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  listenToVotingSessions,
  listenToVotingParticipants,
  submitAnonymousVote,
  closeVotingSession,
} from "../services/votingService";
import { useAuth } from "../context/AuthContext";
import { db } from "../config/firebase";
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, orderBy, onSnapshot } from "firebase/firestore";

function ResultBar({ label, count, total, tone }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = tone === "yes" ? "bg-emerald-600" : "bg-red-600";
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-slate-500">{count} votes, {percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function VotingSessionCard({ session }) {
  const { member } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [submitting, setSubmitting] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return listenToVotingParticipants(session.id, setParticipants, (error) => setMessage(error.message));
  }, [session.id]);

  const hasVoted = useMemo(() => participants.some((p) => p.id === member?.uid), [participants, member?.uid]);
  const closed = session.status === "closed";
  const totalVotes = session.totalVotes || 0;

  async function handleVote(choice) {
    setSubmitting(choice);
    try {
      await submitAnonymousVote({ sessionId: session.id, choice, member });
      setMessage("Your vote was submitted anonymously.");
    } catch (error) { setMessage(error.message); } finally { setSubmitting(""); }
  }

  async function handleCloseSession() {
    if (!window.confirm("Are you sure you want to close this session?")) return;
    setActionLoading(true);
    try {
      await closeVotingSession({ sessionId: session.id, closedByMember: member });
      setMessage("Session closed successfully.");
    } catch (error) { setMessage(error.message); } finally { setActionLoading(false); }
  }

  async function handleApproveAndAddMember() {
    if (!window.confirm(`Approve ${session.applicant?.fullName}?`)) return;
    setActionLoading(true);
    try {
      if (session.applicationId) {
        await updateDoc(doc(db, "applications", session.applicationId), { status: "approved", updatedAt: serverTimestamp() });
      }
      await setDoc(doc(db, "members", session.applicationId || Date.now().toString()), {
        fullName: session.applicant.fullName,
        email: session.applicant.email || "",
        role: "member",
        status: "active",
        createdAt: serverTimestamp(),
      });
      setMessage("Member approved and added.");
    } catch (error) { setMessage(error.message); } finally { setActionLoading(false); }
  }

  return (
    <article className="grid gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_320px]">
      <div>
        <div className="flex gap-4">
          <img src={session.applicant?.photoURL || "/default-avatar.png"} className="h-16 w-16 rounded-md border border-slate-200 object-cover" alt="Applicant" />
          <div>
            <p className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold ${closed ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
              <Vote size={14} /> {closed ? "Closed voting" : "Active voting"}
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">{session.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{session.description || "Review and vote."}</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <ResultBar label="Yes" count={session.yesCount || 0} total={totalVotes} tone="yes" />
          <ResultBar label="No" count={session.noCount || 0} total={totalVotes} tone="no" />
        </div>
        
        {/* বাটন সেকশন: সরাসরি রাখা হয়েছে যেন অ্যাডমিন দেখতে পান */}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-dashed border-slate-200 pt-4">
          {!closed ? (
            <button type="button" disabled={actionLoading} onClick={handleCloseSession} className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <SquareX size={16} />} Close Voting
            </button>
          ) : (
            <button type="button" disabled={actionLoading} onClick={handleApproveAndAddMember} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Approve Member
            </button>
          )}
        </div>

        {!closed && !hasVoted && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => handleVote("yes")} disabled={Boolean(submitting)} className="flex-1 bg-emerald-700 text-white px-4 py-2 rounded font-semibold text-sm">Vote Yes</button>
            <button onClick={() => handleVote("no")} disabled={Boolean(submitting)} className="flex-1 bg-red-700 text-white px-4 py-2 rounded font-semibold text-sm">Vote No</button>
          </div>
        )}
        {message && <p className="mt-4 text-sm text-emerald-700 bg-emerald-50 p-2 rounded">{message}</p>}
      </div>
      <aside className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <h3 className="flex items-center gap-2 font-bold"><Users size={18} /> Participated</h3>
        <div className="mt-4 space-y-3">
          {participants.map((p) => <p key={p.id} className="text-sm font-medium">{p.fullName}</p>)}
        </div>
      </aside>
    </article>
  );
}

export default function VotingPage() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const q = query(collection(db, "votingSessions"), orderBy("startedAt", "desc"));
    return onSnapshot(q, (s) => setSessions(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => setError(e.message));
  }, []);
  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-slate-950">New Member Voting</h1>
        <div className="mt-6 space-y-6">
          {sessions.map((s) => <VotingSessionCard key={s.id} session={s} />)}
        </div>
      </div>
    </main>
  );
}