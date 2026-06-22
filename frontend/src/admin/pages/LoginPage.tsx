import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "../auth/useAdminAuth";
import { AdminApiError, hasApiBase } from "../lib/adminApi";
import { Brand } from "../ui";

export default function LoginPage() {
  const { isAuthed, login } = useAdminAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthed) return <Navigate to="/admin/dashboard" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(password);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4">
      {/* background accents */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-5 text-white">
            <div className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="h-5 w-5" />
              เข้าสู่ระบบหลังบ้าน
            </div>
            <p className="mt-1 text-sm text-blue-100">สำหรับผู้ดูแลระบบ SHDcareers เท่านั้น</p>
          </div>

          <form onSubmit={onSubmit} className="p-6">
            {!hasApiBase() && (
              <div className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-inset ring-amber-200/60">
                ยังไม่ได้ตั้งค่า <code>VITE_API_BASE</code> — ต้องเชื่อมต่อ backend ก่อน
              </div>
            )}

            <label className="mb-1.5 block text-sm font-semibold text-gray-800">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                className="input pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-inset ring-red-200/60">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="btn-primary mt-5 w-full shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} SHDcareers · ระบบจัดการหลังบ้าน
        </p>
      </div>
    </div>
  );
}
