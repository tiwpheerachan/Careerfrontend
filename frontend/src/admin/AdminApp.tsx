import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AdminAuthProvider, useAdminAuth } from "./auth/useAdminAuth";
import AdminLayout from "./AdminLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import ApplicationDetailPage from "./pages/ApplicationDetailPage";
import JobsListPage from "./pages/JobsListPage";
import JobEditPage from "./pages/JobEditPage";
import ContentPage from "./pages/ContentPage";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthed } = useAdminAuth();
  const loc = useLocation();
  if (!isAuthed) {
    return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  }
  return children;
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      {/* ❌ ไม่ให้ search engine เก็บ index หน้า admin */}
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>SHDcareers · Admin</title>
      </Helmet>

      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="jobs" element={<JobsListPage />} />
          <Route path="jobs/new" element={<JobEditPage />} />
          <Route path="jobs/:jobId/edit" element={<JobEditPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="applications/:id" element={<ApplicationDetailPage />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
