import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { CommitteeRoute, MemberRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import ApplyPage from "./pages/ApplyPage";
import CommitteePage from "./pages/CommitteePage";
import CompleteSignup from "./pages/CompleteSignup";
import Dashboard from "./pages/Dashboard";
import EventManagement from "./pages/EventManagement";
import Login from "./pages/Login";
import MemberDirectory from "./pages/MemberDirectory";
import MemberProfileDetail from "./pages/MemberProfileDetail";
import NoticeBoard from "./pages/NoticeBoard";

const AdminVotingCreator = lazy(() => import("./pages/AdminVotingCreator"));
const CommonChatRoom = lazy(() => import("./pages/CommonChatRoom"));
const Gallery = lazy(() => import("./pages/Gallery"));
const VotingPage = lazy(() => import("./pages/VotingPage"));

function RouteLoader() {
  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-slate-50 px-4">
      <div className="rounded-md border border-emerald-100 bg-white px-6 py-5 text-center shadow-sm">
        <Loader2 size={28} className="mx-auto animate-spin text-emerald-700" />
        <p className="mt-3 text-sm font-semibold text-slate-700">
          Loading Mayabon Poribar...
        </p>
      </div>
    </main>
  );
}

function LazyRoute({ children }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

function PageShell({ title, subtitle }) {
  return (
    <main className="mx-auto min-h-[calc(100vh-65px)] max-w-7xl px-4 py-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-base leading-7 text-slate-600">{subtitle}</p>
        )}
      </div>
    </main>
  );
}

function LandingPage() {
  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-7xl rounded-md border border-emerald-100 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
          Mayabon Poribar
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-950">
          A warm digital home for our community.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Members can connect through profiles, notices, events, gallery,
          real-time chat, and anonymous voting for new applications.
        </p>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/committee" element={<CommitteePage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/complete-signup" element={<CompleteSignup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/unauthorized"
          element={
            <PageShell
              title="Unauthorized"
              subtitle="You do not have permission to view this page."
            />
          }
        />
        <Route
          path="/pending-approval"
          element={
            <PageShell
              title="Membership Pending"
              subtitle="Your account exists, but your Mayabon Poribar membership is not active yet."
            />
          }
        />

        <Route element={<MemberRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/members" element={<MemberDirectory />} />
          <Route path="/members/:memberId" element={<MemberProfileDetail />} />
          <Route
            path="/chat"
            element={
              <LazyRoute>
                <CommonChatRoom />
              </LazyRoute>
            }
          />
          <Route
            path="/voting"
            element={
              <LazyRoute>
                <VotingPage />
              </LazyRoute>
            }
          />
          <Route path="/notices" element={<NoticeBoard />} />
          <Route path="/events" element={<EventManagement />} />
          <Route
            path="/gallery"
            element={
              <LazyRoute>
                <Gallery />
              </LazyRoute>
            }
          />
        </Route>

        <Route element={<CommitteeRoute />}>
          <Route
            path="/admin"
            element={
              <PageShell
                title="Admin Dashboard"
                subtitle="Use the navigation to manage notices, events, gallery, and voting sessions."
              />
            }
          />
          <Route path="/admin/notices" element={<NoticeBoard />} />
          <Route path="/admin/events" element={<EventManagement />} />
          <Route
            path="/admin/gallery"
            element={
              <LazyRoute>
                <Gallery />
              </LazyRoute>
            }
          />
          <Route
            path="/admin/voting"
            element={
              <LazyRoute>
                <VotingPage />
              </LazyRoute>
            }
          />
          <Route
            path="/admin/voting-creator"
            element={
              <LazyRoute>
                <AdminVotingCreator />
              </LazyRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
