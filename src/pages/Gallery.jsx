import { Image, ImagePlus, Loader2, Plus, UploadCloud, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  title: "",
  description: "",
  eventId: "",
};

export default function Gallery() {
  const { member, isCommittee } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    const galleryQuery = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
    return onSnapshot(
      galleryQuery,
      (snapshot) => {
        setPhotos(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, []);

  function uploadGalleryImage(photoId) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("Please choose an image to upload."));
        return;
      }

      if (!file.type.startsWith("image/")) {
        reject(new Error("Only image files are allowed."));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        reject(new Error("Image must be smaller than 5 MB."));
        return;
      }

      const extension = file.name.split(".").pop() || "jpg";
      const imageRef = ref(storage, `gallery/${photoId}/photo.${extension}`);
      const task = uploadBytesResumable(imageRef, file, {
        contentType: file.type,
      });

      task.on(
        "state_changed",
        (snapshot) => {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(percent);
        },
        reject,
        async () => {
          const downloadURL = await getDownloadURL(task.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  }

  async function handleCreate(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setUploadProgress(0);

    try {
      const newDocRef = doc(collection(db, "gallery"));
      const imageURL = await uploadGalleryImage(newDocRef.id);

      await setDoc(newDocRef, {
        title: form.title.trim(),
        description: form.description.trim(),
        eventId: form.eventId.trim(),
        imageURL,
        uploadedBy: member.uid,
        uploadedByName: member.fullName || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setForm(initialForm);
      setFile(null);
      setUploadProgress(0);
      setOpen(false);
    } catch (err) {
      setError(err.message || "Could not upload gallery photo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Photo Gallery</h1>
            <p className="mt-2 text-sm text-slate-600">
              Photos from events, gatherings, and shared memories.
            </p>
          </div>
          {isCommittee && (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Plus size={18} />
              Upload Photo
            </button>
          )}
        </div>

        {error && (
          <p className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <div className="mt-6 flex items-center gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading gallery...
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {photos.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 sm:col-span-2 lg:col-span-3">
                No gallery photos yet.
              </div>
            )}

            {photos.map((photo) => (
              <article key={photo.id} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="aspect-[4/3] bg-slate-100">
                  {photo.imageURL ? (
                    <img src={photo.imageURL} alt={photo.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <Image size={48} />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-bold text-slate-950">{photo.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                    {photo.description}
                  </p>
                  {photo.eventId && (
                    <p className="mt-3 inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      Event: {photo.eventId}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <form onSubmit={handleCreate} className="w-full max-w-lg rounded-md bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">Upload Gallery Photo</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-slate-100" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Photo title" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" />
              <input value={form.eventId} onChange={(event) => setForm((current) => ({ ...current, eventId: event.target.value }))} placeholder="Related event ID or category" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" />
              <textarea rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Caption or description" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" />
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600 hover:border-emerald-400">
                <ImagePlus size={20} className="text-emerald-700" />
                <span className="min-w-0 truncate">
                  {file ? file.name : "Choose image file"}
                </span>
                <input required type="file" accept="image/*" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </label>
            </div>

            {submitting && (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
                  <span>Uploading</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <button
              disabled={submitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
              {submitting ? "Uploading..." : "Upload Photo"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
