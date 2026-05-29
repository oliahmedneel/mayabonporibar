import { Check, Lock, Users, Vote, X, SquareX, UserPlus, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  listenToVotingSessions,
  listenToVotingParticipants,
  submitAnonymousVote,
  closeVotingSession, // সেশন ক্লোজ করার ফাংশন আনা হলো
} from "../services/votingService";
import { useAuth } from "../context/AuthContext";
import { db } from "../config/firebase";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

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
  const [actionLoading, setActionLoading] = useState(false); // সেশন অ্যাকশনের জন্য লোডার
  const [message, setMessage] = useState("");

  useEffect(() => {
    return listenToVotingParticipants(session.id, setParticipants, (error) => {
      setMessage(error.message);
    });
  }, [session.id]);

  const hasVoted = useMemo(
    () => participants.some((participant) => participant.id === member?.uid),
    [participants, member?.uid]
  );

  const closed = session.status === "closed";
  const totalVotes = session.totalVotes || 0;
  const isAdmin = member?.role === "admin" || member?.email === "oliahmedneel@gmail.com";

  async function handleVote(choice) {
    setSubmitting(choice);
    setMessage("");
    try {
      await submitAnonymousVote({ sessionId: session.id, choice, member });
      setMessage("Your vote was submitted anonymously.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting("");
    }
  }

  // সেশন বন্ধ করার নতুন ফাংশন
  async function handleCloseSession() {
    if (!window.confirm("Are you sure you want to close this voting session?")) return;
    setActionLoading(true);
    setMessage("");
    try {
      await closeVotingSession({ sessionId: session.id, closedByMember: member });
      setMessage("Voting session closed successfully.");
    } catch (error) {
      setMessage(error.message || "Could not close voting session.");
    } finally {
      setActionLoading(false);
    }
  }

  // মেম্বার এপ্রুভ করে ডিরেক্টরিতে অ্যাড করার নতুন ফাংশন
  async function handleApproveAndAddMember() {
    if (!window.confirm(`Do you want to officially approve ${session.applicant?.fullName} as a member?`)) return;
    setActionLoading(true);
    setMessage("");
    try {
      // ১. applications কালেকশনে স্ট্যাটাস এপ্রুভড করা
      if (session.applicationId) {
        await updateDoc(doc(db, "applications", session.applicationId), {
          status: "approved",
          updatedAt: serverTimestamp(),
        });
      }

      // ২. members কালেকশনে নতুন মেম্বার যুক্ত করা (আবেদনকারীর ইমেইল আইডি জেনারেট করে বা র্যান্ডমলি)
      const newMemberId = session.applicationId || doc(collection(db, "members")).id;
      await setDoc(doc(db, "members", newMemberId), {
        fullName: session.applicant.fullName,
        email: session.applicant.email || "",
        role: "member",
        status: "active",
        createdAt: serverTimestamp(),
      });

      setMessage(`${session.applicant?.fullName} has been approved and added to the member directory.`);
    } catch (error) {
      setMessage(error.message || "Could not approve member.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <article className="grid gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_320px]">
      <div>
        <div className="flex gap-4">
          <img
            src={session.applicant?.photoURL || "/default-avatar.png"}
            alt={session.applicant?.fullName || "Applicant"}
            className="h-16 w-16 rounded-md border border-slate-200 object-cover"
          />
          <div>
            <p className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold ${closed ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
              <Vote size={14} />
              {closed ? "Closed voting" : "Active voting"}
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              {session.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {session.description || "Please review and cast your vote."}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <ResultBar label="Yes" count={session.yesCount || 0} total={totalVotes} tone="yes" />
          <ResultBar label="No" count={session.noCount || 0} total={totalVotes} tone="no" />
        </div>

        <div className="mt-6 rounded-md bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <Lock size={18} className="mt-0.5 text-emerald-700" />
            <p className="text-sm leading-6 text-slate-600">
              Your identity is recorded only as participated. Your Yes or No
              choice is saved in a separate anonymous vote record.
            </p>
          </div>
        </div>

        {/* অ্যাডমিন প্যানেল কন্ট্রোল বাটন সমূহ */}
        
          <div className="mt-5 flex flex-wrap gap-3 border-t border-dashed border-slate-200 pt-4">
            {!closed ? (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCloseSession}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:bg-slate-400"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <SquareX size={16} />}
                Close Voting Session
              </button>
            ) : (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleApproveAndAddMember}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-400"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Approve & Add Member
              </button>
            )}
          </div>
        

        {!closed && !hasVoted && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={Boolean(submitting)}
              onClick={() => handleVote("yes")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-400"
            >
              <Check size={18} />
              {submitting === "yes" ? "Submitting..." : "Vote Yes"}
            </button>
            <button
              type="button"
              disabled={Boolean(submitting)}
              onClick={() => handleVote("no")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:bg-slate-400"
            >
              <X size={18} />
              {submitting === "no" ? "Submitting..." : "Vote No"}
            </button>
          </div>
        )}

        {!closed && hasVoted && (
          <p className="mt-5 rounded-md bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            You have already participated in this vote.
          </p>
        )}
        {message && <p className="mt-4 text-sm font-medium text-emerald-700 bg-emerald-50 p-2 rounded">{message}</p>}
      </div>

      <aside className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <h3 className="flex items-center gap-2 font-bold text-slate-950">
          <Users size={18} />
          Participated
        </h3>
        <div className="mt-4 space-y-3">
          {participants.length === 0 && (
            <p className="text-sm text-slate-500">No members have voted yet.</p>
          )}
          {participants.map((participant) => (
            <div key={participant.id} className="flex items-center gap-3">
              <img
                src={participant.photoURL || "/default-avatar.png"}
                alt={participant.fullName}
                className="h-9 w-9 rounded-full border border-slate-200 object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {participant.fullName}
                </p>
                <p className="text-xs text-slate-500">has voted</p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </article>
  );
}

export default function VotingPage() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // সব সেশন (অ্যাক্টিভ এবং ক্লোজড দুইটাই) একসাথে ট্র্যাক করার জন্য ফায়ারবেস কুয়েরি
    const { collection, query, orderBy, onSnapshot } = require("firebase/firestore");
    const sessionsQuery = query(
      collection(db, "votingSessions"),
      orderBy("startedAt", "desc")
    );

    return onSnapshot(
      sessionsQuery,
      (snapshot) => {
        setSessions(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      (err) => {
        setError(err.message);
      }
    );
  }, []);

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-slate-950">New Member Voting</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review applications, vote anonymously, and view final results after sessions close.
        </p>
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 space-y-6">
          {sessions.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No voting sessions yet.
            </div>
          )}
          {sessions.map((session) => (
            <VotingSessionCard key={session.id} session={session} />
          ))}
        </div>
      </div>
    </main>
  );
}