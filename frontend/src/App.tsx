import { Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import AboutPage from "@/pages/AboutPage";
import WhyPage from "@/pages/WhyPage";
import JobsPage from "@/pages/JobsPage";
import JobDetailPage from "@/pages/JobDetailPage";
import ApplyPage from "@/pages/ApplyPage";
import PartnersPage from "@/pages/PartnersPage";
import NotFoundPage from "@/pages/NotFoundPage";
import AdminApp from "@/admin/AdminApp";

export default function App() {
  return (
    <Routes>
      {/* ✅ ระบบหลังบ้าน — แยกออกจาก Layout เว็บสาธารณะ (ไม่มี Navbar/Footer/ลิงก์ใดๆ ชี้มา)
          เข้าถึงได้ทางเดียวคือพิมพ์ URL /admin ตรงๆ */}
      <Route path="/admin/*" element={<AdminApp />} />

      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/why-shd" element={<WhyPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        <Route path="/jobs/:jobId/apply" element={<ApplyPage />} />
        <Route path="/partners" element={<PartnersPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
