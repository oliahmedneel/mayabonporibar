import { CheckCircle2, Loader2, Mail, Phone, PlayCircle, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { createVotingSession } from "../services/votingService";

function dateText(value) {
  const date = value?.toDate?.();
  return date ? date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Recently";
}

export default function AdminVotingCreator() {
  const { member } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const applicationsQuery = query(
      collection(db, "applications"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      applicationsQuery,
      (snapshot) => {
        setApplications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, []);

  async function handleStartVoting(application) {
    setStartingId(application.id);
    setMessage("");
    setError("");

    try {
      await createVotingSession({
        applicationId: application.id,
        applicant: {
          fullName: application.fullName,
          email: application.email,
          phone: application.phone,
          bio: application.bio,
          socialLink: application.socialLink,
        },
        title: `Membership vote for ${application.fullName}`,
        description: application.bio || "Please review this member application.",
        createdByMember: member,
      });

      setMessage(`Voting session started for ${application.fullName}.`);
    } catch (err) {
      setError(err.message || "Could not start voting session.");
    } finally {
      setStartingId("");
    }
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
          Admin Panel
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Pending Applications
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Start anonymous member voting for applicants waiting for committee review.
        </p>

        {message && (
          <p className="mt-5 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 size={18} />
            {message}
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <div className="mt-6 flex items-center gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading applications...
          </div>
        ) : (
          <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {applications.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                No pending applications.
              </div>
            )}

            {applications.map((application) => (
              <article key={application.id} className="rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                      <UserRound size={28} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-slate-950">
                        {application.fullName}
                      </h2>
                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                        <Mail size={15} />
                        <span className="truncate">{application.email}</span>
                      </p>
                      {application.phone && (
                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                          <Phone size={15} />
                          {application.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600">
                    {application.bio}
                  </p>

                  {application.socialLink && (
                    <a
                      href={application.socialLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block max-w-full truncate text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      {application.socialLink}
                    </a>
                  )}

                  <p className="mt-3 text-xs text-slate-400">
                    Submitted {dateText(application.createdAt)}
                  </p>
                </div>

                <div className="border-t border-slate-100 p-5">
                  <button
                    type="button"
                    disabled={startingId === application.id}
                    onClick={() => handleStartVoting(application)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {startingId === application.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <PlayCircle size={18} />
                    )}
                    {startingId === application.id ? "Starting..." : "Start Voting Session"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
