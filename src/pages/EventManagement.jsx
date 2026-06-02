import { CalendarDays, CheckCircle2, ImagePlus, Loader2, MapPin, Plus, UserX, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { closeExpiredEvents, isEventExpired, syncExpiredEventsToClosed, uploadEventCoverImage } from "../services/eventService";

function dateText(value) {
  const date = value?.toDate?.();
  return date ? date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Date pending";
}

function EventCard({ item, member, onRsvp }) {
  const [rsvps, setRsvps] = useState([]);
  const isClosed = isEventExpired(item);

  useEffect(() => {
    return onSnapshot(collection(db, "events", item.id, "rsvps"), (snapshot) => {
      setRsvps(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    });
  }, [item.id]);

  const counts = useMemo(
    () =>
      rsvps.reduce(
        (acc, rsvp) => {
          if (rsvp.response === "going") acc.going += 1;
          if (rsvp.response === "not_going") acc.notGoing += 1;
          return acc;
        },
        { going: 0, notGoing: 0 }
      ),
    [rsvps]
  );

  const myRsvp = rsvps.find((rsvp) => rsvp.id === member?.uid)?.response;
  const canRespond = Boolean(member && !isClosed);

  return (
    <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[16/9] bg-slate-100">
        {item.coverImageURL ? (
          <img src={item.coverImageURL} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <CalendarDays size={42} />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-950">{item.title}</h2>
          <span
            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
              isClosed ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isClosed ? "Closed" : "Open"}
          </span>
        </div>
        <div className="mt-3 space-y-2 text-sm text-slate-500">
          <p className="flex items-center gap-2"><CalendarDays size={16} />{dateText(item.eventDate)}</p>
          <p className="flex items-center gap-2"><MapPin size={16} />{item.location || "Location pending"}</p>
        </div>
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
            <CheckCircle2 size={16} />
            {counts.going} Going
          </div>
          <div className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
            <UserX size={16} />
            {counts.notGoing} Not Going
          </div>
        </div>

        {myRsvp && !isClosed && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Your RSVP: {myRsvp === "going" ? "Going" : "Not Going"}
          </p>
        )}
        {isClosed && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
            This event is closed because the event time has passed.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onRsvp(item.id, "going")}
            disabled={!canRespond}
            className="flex-1 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Going
          </button>
          <button
            onClick={() => onRsvp(item.id, "not_going")}
            disabled={!canRespond}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            Not Going
          </button>
        </div>
      </div>
    </article>
  );
}

export default function EventManagement() {
  const { member, isCommittee } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    eventDate: "",
  });

  useEffect(() => {
    const eventsQuery = query(collection(db, "events"), orderBy("eventDate", "asc"));
  const unsubscribe = onSnapshot(
      eventsQuery,
      async (snapshot) => {
        const nextEvents = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setEvents(nextEvents);
        setLoading(false);

        try {
          await closeExpiredEvents(nextEvents);
        } catch (closeError) {
          console.warn("Unable to auto-close expired events:", closeError);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    void syncExpiredEventsToClosed().catch((err) => {
      console.warn("Initial event close sync failed:", err);
    });

    const interval = setInterval(() => {
      void syncExpiredEventsToClosed().catch((err) => {
        console.warn("Scheduled event close sync failed:", err);
      });
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    try {
      const coverImageURL = coverFile ? await uploadEventCoverImage(coverFile) : "";

      await addDoc(collection(db, "events"), {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        eventDate: Timestamp.fromDate(new Date(form.eventDate)),
        coverImageURL,
        status: "active",
        createdBy: member.uid,
        createdByName: member.fullName || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        closedAt: null,
        closedReason: "",
      });

      setForm({ title: "", description: "", location: "", eventDate: "" });
      setCoverFile(null);
      setOpen(false);
    } catch (err) {
      setError(err.message || "Could not create event.");
    }
  }

  async function handleRsvp(eventId, response) {
    await setDoc(doc(db, "events", eventId, "rsvps", member.uid), {
      memberId: member.uid,
      fullName: member.fullName || "",
      photoURL: member.photoURL || "",
      response,
      respondedAt: serverTimestamp(),
    });
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Events</h1>
            <p className="mt-2 text-sm text-slate-600">
              Community gatherings, meetings, and shared celebrations.
            </p>
          </div>
          {isCommittee && (
            <button onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              <Plus size={18} />
              Create New
            </button>
          )}
        </div>

        {error && <p className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <div className="mt-6 flex items-center gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading events...
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {events.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                No events have been published yet.
              </div>
            )}
            {events.map((item) => (
              <EventCard key={item.id} item={item} member={member} onRsvp={handleRsvp} />
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <form onSubmit={handleCreate} className="w-full max-w-lg rounded-md bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">Create Event</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-slate-100" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Event title" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" />
              <input required type="datetime-local" value={form.eventDate} onChange={(event) => setForm((current) => ({ ...current, eventDate: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" />
              <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Location" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" />
              <textarea required rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" />
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600 hover:border-emerald-400">
                <ImagePlus size={20} className="text-emerald-700" />
                <span className="min-w-0 truncate">
                  {coverFile ? coverFile.name : "Choose cover image"}
                </span>
                <input
                  required
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
                />
              </label>
            </div>
            <button className="mt-5 w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              Publish Event
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
