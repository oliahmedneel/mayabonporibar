import { collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { uploadImageToImgBB } from "./imageService";

export function isEventExpired(event) {
  const status = event?.status || "active";
  if (status === "closed") {
    return true;
  }

  const eventDate = event?.eventDate?.toDate?.() || (event?.eventDate ? new Date(event.eventDate) : null);
  if (!eventDate) {
    return false;
  }

  return eventDate.getTime() <= Date.now();
}

export async function closeExpiredEvents(events = []) {
  const updates = events
    .filter((event) => event?.id && event.status !== "closed" && isEventExpired(event))
    .map((event) =>
      updateDoc(doc(db, "events", event.id), {
        status: "closed",
        closedAt: serverTimestamp(),
        closedReason: "expired",
        updatedAt: serverTimestamp(),
      })
    );

  await Promise.all(updates);
}

export async function syncExpiredEventsToClosed() {
  const eventsQuery = query(collection(db, "events"), orderBy("eventDate", "asc"));
  const snapshot = await getDocs(eventsQuery);
  await closeExpiredEvents(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
}

export async function uploadEventCoverImage(file) {
  return uploadImageToImgBB(file, {
    maxWidth: 1600,
    maxHeight: 900,
    quality: 0.82,
  });
}
