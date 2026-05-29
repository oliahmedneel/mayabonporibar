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
  const [configs, setConfigs] = useState({});

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

  function updateConfig(id, key, value) {
    setConfigs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [key]: value,
      },
    }));
  }

  function getConfig(id) {
    return configs[id] || {
      isOpen: false,
      durationOption: "manual",
      customClosesAt: "",
      title: "",
      description: "",
    };
  }

  function handleToggleOpen(id, application) {
    setConfigs((prev) => {
      const current = prev[id] || {};
      const isOpen = !current.isOpen;
      return {
        ...prev,
        [id]: {
          ...current,
          isOpen,
          title: current.title || `Membership vote for ${application.fullName}`,
          description: current.description || application.bio || "Please review this member application.",
          durationOption: current.durationOption || "manual",
          customClosesAt: current.customClosesAt || "",
        },
      };
    });
  }

  function getMinDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  async function handleStartVoting(application) {
    setStartingId(application.id);
    setMessage("");
    setError("");

    try {
      const config = getConfig(application.id);
      let closesAt = null;

      if (config.durationOption === "1h") {
        closesAt = new Date(Date.now() + 60 * 60 * 1000);
      } else if (config.durationOption === "6h") {
        closesAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
      } else if (config.durationOption === "12h") {
        closesAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      } else if (config.durationOption === "24h") {
        closesAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      } else if (config.durationOption === "custom") {
        if (!config.customClosesAt) {
          throw new Error("Please select a closing date and time.");
        }
        closesAt = new Date(config.customClosesAt);
        if (closesAt <= new Date()) {
          throw new Error("Closing time must be in the future.");
        }
      }

      await createVotingSession({
        applicationId: application.id,
        applicant: {
          fullName: application.fullName,
          email: application.email,
          phone: application.phone,
          bio: application.bio,
          socialLink: application.socialLink,
        },
        title: config.title || `Membership vote for ${application.fullName}`,
        description: config.description || application.bio || "Please review this member application.",
        createdByMember: member,
        closesAt,
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

            {applications.map((application) => {
              const config = getConfig(application.id);
              return (
                <article key={application.id} className="rounded-md border border-slate-200 bg-white shadow-sm flex flex-col justify-between animate-fadeIn">
                  <div className="p-5 flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 flex-shrink-0">
                        <UserRound size={28} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-bold text-slate-950">
                          {application.fullName}
                        </h2>
                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                          <Mail size={15} className="flex-shrink-0" />
                          <span className="truncate">{application.email}</span>
                        </p>
                        {application.phone && (
                          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                            <Phone size={15} className="flex-shrink-0" />
                            {application.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {!config.isOpen ? (
                      <div className="mt-4">
                        <p className="line-clamp-4 text-sm leading-6 text-slate-600">
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
                    ) : (
                      <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                        <h3 className="text-sm font-bold text-slate-800">Voting Settings</h3>
                        
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Session Title</label>
                          <input
                            type="text"
                            value={config.title}
                            onChange={(e) => updateConfig(application.id, "title", e.target.value)}
                            className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600 text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                          <textarea
                            value={config.description}
                            onChange={(e) => updateConfig(application.id, "description", e.target.value)}
                            rows={3}
                            className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600 resize-none text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-2">Voting Duration</label>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {[
                              { label: "Manual Close", value: "manual" },
                              { label: "1 Hour", value: "1h" },
                              { label: "6 Hours", value: "6h" },
                              { label: "24 Hours", value: "24h" },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateConfig(application.id, "durationOption", opt.value)}
                                className={`px-2.5 py-1.5 text-xs font-semibold rounded border transition text-center ${
                                  config.durationOption === opt.value
                                    ? "bg-emerald-50 border-emerald-600 text-emerald-800"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => updateConfig(application.id, "durationOption", "custom")}
                            className={`w-full px-2.5 py-1.5 text-xs font-semibold rounded border transition text-center ${
                              config.durationOption === "custom"
                                ? "bg-emerald-50 border-emerald-600 text-emerald-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            Custom End Time
                          </button>
                        </div>

                        {config.durationOption === "custom" && (
                          <div className="mt-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Choose End Time</label>
                            <input
                              type="datetime-local"
                              value={config.customClosesAt}
                              min={getMinDateTime()}
                              onChange={(e) => updateConfig(application.id, "customClosesAt", e.target.value)}
                              className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600 text-slate-700"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 p-5 bg-slate-50 rounded-b-md flex gap-2">
                    {!config.isOpen ? (
                      <button
                        type="button"
                        onClick={() => handleToggleOpen(application.id, application)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                      >
                        <PlayCircle size={18} />
                        Setup & Start Voting
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleOpen(application.id, application)}
                          className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={startingId === application.id}
                          onClick={() => handleStartVoting(application)}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                          {startingId === application.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <PlayCircle size={16} />
                          )}
                          Launch Vote
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
