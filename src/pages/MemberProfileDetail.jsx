import { ArrowLeft, BriefcaseBusiness, CalendarDays, Loader2, Mail, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

function dateText(value) {
  const date = value?.toDate?.();
  return date ? date.toLocaleDateString([], { dateStyle: "medium" }) : "Not available";
}

export default function MemberProfileDetail() {
  const { memberId } = useParams();
  const { uid } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [bioText, setBioText] = useState("");

  const isMyProfile = uid === memberId;

  useEffect(() => {
    if (!memberId) return undefined;

    return onSnapshot(
      doc(db, "members", memberId),
      (snapshot) => {
        const data = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
        setProfile(data);
        if (data) setBioText(data.bio || "");
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, [memberId]);

  async function handleUpdateBio() {
    try {
      await updateDoc(doc(db, "members", memberId), { bio: bioText });
      setIsEditing(false);
    } catch (err) {
      alert("Failed to update bio: " + err.message);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
          <Loader2 size={16} className="animate-spin" />
          Loading member profile...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-md bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Member profile was not found.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/members"
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
        >
          <ArrowLeft size={16} />
          Back to Directory
        </Link>

        <section className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="h-28 bg-emerald-700" />
          <div className="px-6 pb-6">
            <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end">
              <img
                src={profile.photoURL || `${import.meta.env.BASE_URL}default-avatar.svg`}
                alt={profile.fullName}
                className="h-28 w-28 rounded-md border-4 border-white object-cover shadow-sm"
              />
              <div className="min-w-0 pb-1">
                <p className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold capitalize text-emerald-800">
                  {(profile.role || "general_member").replace("_", " ")}
                </p>
                <h1 className="mt-2 text-3xl font-extrabold text-slate-950">
                  {profile.fullName}
                </h1>
                {profile.banglaName && (
                  <p className="mt-1 text-sm text-slate-500">{profile.banglaName}</p>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-md bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Mail size={16} />
                  Email
                </p>
                <p className="mt-2 break-words text-sm text-slate-600">
                  {profile.email || "Not provided"}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Phone size={16} />
                  Phone
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {profile.phone || "Not provided"}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarDays size={16} />
                  Joined
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {dateText(profile.joinedAt || profile.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <article className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
                <UserRound size={21} className="text-emerald-700" />
                Bio
              </h2>
              {isMyProfile && (
                <button
                  onClick={() => (isEditing ? handleUpdateBio() : setIsEditing(true))}
                  className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  {isEditing ? "Save" : "Edit Bio"}
                </button>
              )}
            </div>
            {isEditing ? (
              <textarea
                className="mt-4 w-full rounded-md border border-slate-300 p-3 text-sm text-slate-700 outline-none focus:border-emerald-600"
                rows={4}
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
              />
            ) : (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {profile.bio || "No bio has been added yet."}
              </p>
            )}
          </article>

          <aside className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
              <BriefcaseBusiness size={21} className="text-emerald-700" />
              Contribution
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {profile.contribution ||
                profile.contributions ||
                "Community contribution details will appear here once added."}
            </p>
            {profile.socialLinks && (
              <div className="mt-5 space-y-2">
                {Object.entries(profile.socialLinks)
                  .filter(([, value]) => Boolean(value))
                  .map(([label, value]) => (
                    <a
                      key={label}
                      href={value}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold capitalize text-emerald-700 hover:bg-emerald-50"
                    >
                      {label}
                    </a>
                  ))}
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
