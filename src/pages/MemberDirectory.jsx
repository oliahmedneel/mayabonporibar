import { Mail, Phone, Shield, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";

// Sort newest first by createdAt (handles both Firestore Timestamp and plain dates)
function sortByCreatedAtDesc(a, b) {
  const aTime = a.createdAt?.toDate?.()?.getTime() ?? (typeof a.createdAt === 'number' ? a.createdAt : 0);
  const bTime = b.createdAt?.toDate?.()?.getTime() ?? (typeof b.createdAt === 'number' ? b.createdAt : 0);
  return bTime - aTime;
}

function getOnlineStatus(lastSeen) {
  if (!lastSeen) return { isOnline: false, text: "Never" };
  const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
  const diffInMinutes = (new Date() - lastSeenDate) / (1000 * 60);
  
  if (diffInMinutes < 5.5) {
    return { isOnline: true, text: "Online" };
  }
  
  return { 
    isOnline: false, 
    text: lastSeenDate.toLocaleString([], { dateStyle: "short", timeStyle: "short" }) 
  };
}

function MemberCard({ member }) {
  const status = getOnlineStatus(member.lastSeen);

  return (
    <Link to={`/members/${member.id}`} className="block rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow relative">
      <div className="flex items-start gap-4">
        <div className="relative">
          <img
            src={member.photoURL || `${import.meta.env.BASE_URL}default-avatar.svg`}
            alt={member.fullName}
            className="h-16 w-16 rounded-md border border-slate-200 object-cover"
          />
          {status.isOnline && (
            <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm"></span>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-bold text-slate-950">{member.fullName}</h2>
          {member.banglaName && <p className="mt-1 text-sm text-slate-500">{member.banglaName}</p>}
          <div className="mt-2 flex items-center gap-2">
            <p className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-600">
              {(member.role || "member").replace("_", " ")}
            </p>
            <span className={`text-[10px] font-medium ${status.isOnline ? "text-emerald-600" : "text-slate-400"}`}>
              {status.isOnline ? "Online" : `Last seen: ${status.text}`}
            </span>
          </div>
        </div>
      </div>
      {member.bio && <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{member.bio}</p>}
      <div className="mt-4 space-y-2 text-sm text-slate-500">
        {member.email && <p className="flex items-center gap-2"><Mail size={15} />{member.email}</p>}
        {member.phone && <p className="flex items-center gap-2"><Phone size={15} />{member.phone}</p>}
      </div>
    </Link>
  );
}

export default function MemberDirectory() {
  const [members, setMembers] = useState([]);
  const [committee, setCommittee] = useState([]);

  useEffect(() => {
    const membersQuery = query(
      collection(db, "members")
    );
    const committeeQuery = query(
      collection(db, "executiveCommittee"),
      where("isActive", "==", true),
      orderBy("order", "asc")
    );

    const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
      const items = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((m) => m.status === "active")
        .sort(sortByCreatedAtDesc);
      setMembers(items);
    });
    const unsubCommittee = onSnapshot(committeeQuery, (snapshot) => {
      setCommittee(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    return () => {
      unsubMembers();
      unsubCommittee();
    };
  }, []);

  const committeeMemberIds = useMemo(
    () => new Set(committee.map((item) => item.memberId).filter(Boolean)),
    [committee]
  );

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-slate-950">Member Directory</h1>
        <p className="mt-2 text-sm text-slate-600">
          Profiles of Mayabon Poribar members and the executive committee.
        </p>

        <section className="mt-6 rounded-md border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
            <Shield size={22} className="text-emerald-700" />
            Executive Committee
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {committee.length === 0 && (
              <p className="text-sm text-slate-500">Committee list is not published yet.</p>
            )}
            {committee.map((item) => (
              <article key={item.id} className="rounded-md bg-emerald-50 p-4">
                <img
                  src={item.photoURL || `${import.meta.env.BASE_URL}default-avatar.svg`}
                  alt={item.fullName}
                  className="h-16 w-16 rounded-md border border-emerald-100 object-cover"
                />
                <h3 className="mt-3 font-bold text-slate-950">{item.fullName}</h3>
                {item.banglaName && <p className="text-sm text-slate-600">{item.banglaName}</p>}
                <p className="mt-2 text-sm font-semibold text-emerald-800">
                  {item.designation}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
            <Users size={22} className="text-emerald-700" />
            All Members
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={{
                  ...member,
                  role: committeeMemberIds.has(member.uid) ? "executive" : member.role,
                }}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}