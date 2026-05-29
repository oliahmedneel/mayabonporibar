import {
  CalendarDays,
  Image,
  MessageCircle,
  Pin,
  Users,
  Vote,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

const shortcuts = [
  { to: "/members", label: "Member Directory", icon: Users },
  { to: "/chat", label: "Common Chat", icon: MessageCircle },
  { to: "/voting", label: "Voting", icon: Vote },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/gallery", label: "Gallery", icon: Image },
];

function toDateText(value) {
  const date = value?.toDate?.();
  return date ? date.toLocaleDateString() : "Date pending";
}

export default function Dashboard() {
  const { displayName, isCommittee } = useAuth();
  const [notices, setNotices] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const noticesQuery = query(
      collection(db, "notices"),
      orderBy("createdAt", "desc"),
      limit(3)
    );
    const eventsQuery = query(
      collection(db, "events"),
      where("eventDate", ">=", new Date()),
      orderBy("eventDate", "asc"),
      limit(3)
    );

    const unsubNotices = onSnapshot(noticesQuery, (snapshot) => {
      setNotices(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
      setEvents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    return () => {
      unsubNotices();
      unsubEvents();
    };
  }, []);

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-md border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">
            Mayabon Poribar Member Hub
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Welcome, {displayName || "Member"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Stay connected with announcements, gatherings, shared memories, and
            community decisions.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow"
              >
                <Icon size={24} className="text-emerald-700" />
                <p className="mt-4 font-semibold text-slate-950">{item.label}</p>
              </Link>
            );
          })}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950">Recent Notices</h2>
              <Link to="/notices" className="text-sm font-semibold text-emerald-700">
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {notices.length === 0 && (
                <p className="text-sm text-slate-500">No notices published yet.</p>
              )}
              {notices.map((notice) => (
                <article key={notice.id} className="rounded-md bg-slate-50 p-4">
                  <div className="flex items-start gap-2">
                    {notice.isPinned && <Pin size={16} className="mt-1 text-emerald-700" />}
                    <div>
                      <h3 className="font-semibold text-slate-950">{notice.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {notice.body}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950">Upcoming Events</h2>
              <Link to="/events" className="text-sm font-semibold text-emerald-700">
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {events.length === 0 && (
                <p className="text-sm text-slate-500">No upcoming events yet.</p>
              )}
              {events.map((event) => (
                <article key={event.id} className="rounded-md bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-950">{event.title}</h3>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <CalendarDays size={15} />
                    {toDateText(event.eventDate)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {isCommittee && (
          <section className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-bold text-amber-950">Committee Tools</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm" to="/admin/notices">
                Manage Notices
              </Link>
              <Link className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm" to="/admin/events">
                Manage Events
              </Link>
              <Link className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm" to="/admin/gallery">
                Manage Gallery
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
