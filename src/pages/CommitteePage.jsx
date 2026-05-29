import { Award, Loader2, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../config/firebase";

export default function CommitteePage() {
  const [committee, setCommittee] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const committeeQuery = query(
      collection(db, "executiveCommittee"),
      where("isActive", "==", true),
      orderBy("order", "asc")
    );

    return onSnapshot(
      committeeQuery,
      (snapshot) => {
        setCommittee(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, []);

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-md border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-700">
            <Shield size={16} />
            Executive Committee
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
            Leadership of Mayabon Poribar
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            The governing board members serving the community with care,
            accountability, and continuity.
          </p>
        </section>

        {loading && (
          <div className="mt-6 flex items-center gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading committee members...
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && committee.length === 0 && (
          <div className="mt-6 rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Committee information is not published yet.
          </div>
        )}

        <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {committee.map((person, index) => (
            <article
              key={person.id}
              className={`overflow-hidden rounded-md border bg-white shadow-sm ${
                index === 0
                  ? "border-emerald-200 lg:col-span-2"
                  : "border-slate-200"
              }`}
            >
              <div className="aspect-[4/3] bg-slate-100">
                {person.photoURL ? (
                  <img
                    src={person.photoURL}
                    alt={person.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <Award size={46} />
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
                  {person.designation || "Committee Member"}
                </p>
                <h2 className="mt-3 text-xl font-bold text-slate-950">
                  {person.fullName}
                </h2>
                {person.banglaName && (
                  <p className="mt-1 text-sm text-slate-500">{person.banglaName}</p>
                )}
                {person.tenure && (
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    Tenure: {person.tenure}
                  </p>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
