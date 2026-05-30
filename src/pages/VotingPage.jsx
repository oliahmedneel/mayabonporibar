import { Check, Lock, Mail, Users, Vote, X, SquareX, UserPlus, Loader2, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  listenToVotingSessions,
  listenToVotingParticipants,
  submitAnonymousVote,
  closeVotingSession,
} from "../services/votingService";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../config/firebase";
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { sendSignInLinkToEmail } from "firebase/auth";

function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function CountdownTimer({ closesAt, onExpire }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!closesAt) return;

    const targetTime = closesAt.toDate ? closesAt.toDate() : new Date(closesAt);

    function updateTimer() {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(" "));
      setIsExpired(false);
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [closesAt, onExpire]);

  if (!closesAt) return null;

  return (
    <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md w-fit border transition-all ${
      isExpired 
        ? "bg-red-50 border-red-200 text-red-700" 
        : "bg-amber-50 border-amber-200 text-amber-700 animate-pulse"
    }`}>
      <Clock size={13} className={!isExpired ? "animate-spin" : ""} style={{ animationDuration: '6s' }} />
      <span>{isExpired ? "Voting Period Expired" : `Time left: ${timeLeft}`}</span>
    </div>
  );
}

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

function VotingSessionCard({ session, onSessionUpdate }) {
  const { member, isCommittee } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [submitting, setSubmitting] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [timeExpired, setTimeExpired] = useState(false);
  const [currentSession, setCurrentSession] = useState(session);
  const [sendingLinkTo, setSendingLinkTo] = useState(null);

  // Listen to real-time updates of this specific session
  useEffect(() => {
    return onSnapshot(
      doc(db, "votingSessions", session.id),
      (snapshot) => {
        if (snapshot.exists()) {
          setCurrentSession({ id: snapshot.id, ...snapshot.data() });
        }
      },
      (error) => setMessage(error.message)
    );
  }, [session.id]);

  useEffect(() => {
    return listenToVotingParticipants(session.id, setParticipants, (error) => setMessage(error.message));
  }, [session.id]);

  useEffect(() => {
    if (currentSession.closesAt) {
      const targetTime = currentSession.closesAt.toDate ? currentSession.closesAt.toDate() : new Date(currentSession.closesAt);
      setTimeExpired(targetTime < new Date());
    } else {
      setTimeExpired(false);
    }
  }, [currentSession.closesAt, currentSession.status]);

  const hasVoted = useMemo(() => participants.some((p) => p.id === member?.uid), [participants, member?.uid]);
  const closed = currentSession.status === "closed" || timeExpired;
  const totalVotes = currentSession.totalVotes || 0;

  async function handleVote(choice) {
    setSubmitting(choice);
    try {
      await submitAnonymousVote({ sessionId: currentSession.id, choice, member });
      setMessage("Your vote was submitted anonymously.");
    } catch (error) { setMessage(error.message); } finally { setSubmitting(""); }
  }

  async function handleCloseSession() {
    if (!window.confirm("Are you sure you want to close this session?")) return;
    setActionLoading(true);
    try {
      await closeVotingSession({ sessionId: currentSession.id, closedByMember: member });
      setMessage("Session closed successfully.");
    } catch (error) { setMessage(error.message); } finally { setActionLoading(false); }
  }

  async function handleApproveAndAddMember() {
    if (!window.confirm(`Approve ${currentSession.applicant?.fullName}?`)) return;
    setActionLoading(true);
    try {
      const memberDocId = currentSession.applicationId || currentSession.id || Date.now().toString();
      const fullName = currentSession.applicant?.fullName?.trim();
      const fallbackName = currentSession.applicant?.email || currentSession.applicant?.phone || "নাম দেওয়া হয়নি";
      const applicantEmail = (currentSession.applicant?.email || "").trim().toLowerCase();

      if (currentSession.applicationId) {
        await updateDoc(doc(db, "applications", currentSession.applicationId), {
          status: "approved",
          updatedAt: serverTimestamp(),
        });
      }

      const memberData = {
        uid: memberDocId,
        memberId: memberDocId,
        fullName: fullName || fallbackName,
        banglaName: currentSession.applicant?.banglaName || "",
        email: applicantEmail,
        phone: currentSession.applicant?.phone || "",
        bio: currentSession.applicant?.bio || "",
        socialLink: currentSession.applicant?.socialLink || "",
        photoURL: currentSession.applicant?.photoURL || "",
        role: "general_member",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
        approvedBy: member?.uid || "admin",
      };

      await setDoc(doc(db, "members", memberDocId), memberData);

      // --- Send email sign-in link to the new member ---
      if (applicantEmail) {
        const actionCodeSettings = {
          url: `${window.location.origin}/mayabonporibar/complete-signup?email=${encodeURIComponent(applicantEmail)}&memberName=${encodeURIComponent(fullName || fallbackName)}`,
          handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, applicantEmail, actionCodeSettings);
        window.localStorage.setItem("emailForSignIn", applicantEmail);
        setMessage(`✅ ${fullName || fallbackName} approved! A sign-in link has been sent to their email (${applicantEmail}).`);
      } else {
        setMessage("✅ Member approved, but no email found to send sign-in link.");
      }

      await updateDoc(doc(db, "votingSessions", currentSession.id), {
        status: "closed",
        closedAt: serverTimestamp(),
        closedBy: member?.uid || "admin",
        updatedAt: serverTimestamp(),
        memberApproved: true,
      });

      setCurrentSession((prev) => ({
        ...prev,
        status: "closed",
        memberApproved: true,
        closedAt: new Date(),
      }));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResendLoginLink(sessionData) {
    const applicantEmail = (sessionData.applicant?.email || "").trim().toLowerCase();
    if (!applicantEmail) {
      setMessage("❌ No email found for this applicant.");
      return;
    }
    setSendingLinkTo(sessionData.id);
    setMessage("");
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/mayabonporibar/complete-signup?email=${encodeURIComponent(applicantEmail)}&memberName=${encodeURIComponent(sessionData.applicant?.fullName || "")}`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, applicantEmail, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", applicantEmail);
      setMessage(`✅ Login link sent to ${applicantEmail}`);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setSendingLinkTo(null);
    }
  }

  return (
    <article className="grid gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_320px] animate-fadeIn">
      <div>
        <div className="flex gap-4">
          <img src={currentSession.applicant?.photoURL || `${import.meta.env.BASE_URL}default-avatar.svg`} className="h-16 w-16 rounded-md border border-slate-200 object-cover flex-shrink-0" alt="Applicant" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold ${closed ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
                <Vote size={14} /> {closed ? "Closed voting" : "Active voting"}
              </p>
              {!closed && currentSession.closesAt && (
                <CountdownTimer closesAt={currentSession.closesAt} onExpire={() => setTimeExpired(true)} />
              )}
            </div>
            
            {closed && (
              <p className="mt-1.5 text-xs font-medium text-slate-500">
                {currentSession.closedAt 
                  ? `Closed at: ${formatTimestamp(currentSession.closedAt)}` 
                  : currentSession.closesAt 
                    ? `Expired at: ${formatTimestamp(currentSession.closesAt)}` 
                    : "Voting closed"}
              </p>
            )}

            <h2 className="mt-2 text-xl font-bold text-slate-950 truncate">{currentSession.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{currentSession.description || "Review and vote."}</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <ResultBar label="Yes" count={currentSession.yesCount || 0} total={totalVotes} tone="yes" />
          <ResultBar label="No" count={currentSession.noCount || 0} total={totalVotes} tone="no" />
        </div>
        
        {(isCommittee) && (
          <div className="mt-5 flex flex-wrap gap-3 border-t border-dashed border-slate-200 pt-4">
            {!closed ? (
              <button type="button" disabled={actionLoading} onClick={handleCloseSession} className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition">
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <SquareX size={16} />} Close Voting
              </button>
            ) : closed ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:w-full">
                <button type="button" disabled className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white opacity-60 cursor-not-allowed sm:flex-1">
                  <Check size={16} /> Member Approved
                </button>
                <button type="button" disabled={actionLoading || sendingLinkTo === currentSession.id} onClick={() => handleResendLoginLink(currentSession)} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition sm:flex-1">
                  {sendingLinkTo === currentSession.id ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Send Login Link
                </button>
              </div>
            ) : (
              <button type="button" disabled={actionLoading} onClick={handleApproveAndAddMember} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Approve Member
              </button>
            )}
          </div>
        )}

        {!closed && !hasVoted && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => handleVote("yes")} disabled={Boolean(submitting)} className="flex-1 bg-emerald-700 hover:bg-emerald-800 transition text-white px-4 py-2 rounded font-semibold text-sm">Vote Yes</button>
            <button onClick={() => handleVote("no")} disabled={Boolean(submitting)} className="flex-1 bg-red-700 hover:bg-red-800 transition text-white px-4 py-2 rounded font-semibold text-sm">Vote No</button>
          </div>
        )}
        {message && <p className="mt-4 text-sm text-emerald-700 bg-emerald-50 p-2 rounded">{message}</p>}
      </div>
      <aside className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <h3 className="flex items-center gap-2 font-bold text-slate-800"><Users size={18} /> Participated</h3>
        <div className="mt-4 space-y-3 max-h-[220px] overflow-y-auto pr-1">
          {participants.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No one has voted yet.</p>
          ) : (
            participants.map((p) => <p key={p.id} className="text-sm font-medium text-slate-700">{p.fullName}</p>)
          )}
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
          {sessions.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No active or past voting sessions.
            </div>
          ) : (
            sessions.map((s) => <VotingSessionCard key={s.id} session={s} />)
          )}
        </div>
      </div>
    </main>
  );
}