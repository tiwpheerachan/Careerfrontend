import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Briefcase, FileText, LogOut, Menu, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAdminAuth } from "./auth/useAdminAuth";
import { Brand } from "./ui";

const NAV = [
  { to: "/admin/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { to: "/admin/jobs", label: "ประกาศงาน", icon: Briefcase },
  { to: "/admin/applications", label: "ผู้สมัคร", icon: Users },
  { to: "/admin/content", label: "เนื้อหาเว็บ", icon: FileText },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-600 transition-all",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                />
                <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")} />
                {item.label}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function AdminLayout() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-gray-100 px-5">
        <Brand />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">เมนู</div>
        <NavLinks onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="border-t border-gray-100 p-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <ExternalLink className="h-[18px] w-[18px] text-gray-400" />
          ดูเว็บไซต์จริง
        </a>
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-xs font-bold text-white">
              A
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-gray-900">แอดมิน</div>
              <div className="text-[11px] text-gray-400">เข้าสู่ระบบอยู่</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="ออกจากระบบ"
            className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Desktop sidebar (fixed) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-gray-200 bg-white md:block">
        {SidebarInner}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl">{SidebarInner}</aside>
        </div>
      )}

      {/* Main */}
      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
            aria-label="เปิดเมนู"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="md:hidden">
            <Brand compact />
          </div>
          <div className="ml-auto hidden text-sm text-gray-400 md:block">ระบบจัดการหลังบ้าน · SHDcareers</div>
        </header>

        <main className="w-full p-4 sm:p-6 lg:p-8 2xl:p-10">
          <Outlet />
        </main>
      </div>

      {/* close button for mobile drawer */}
      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="fixed right-4 top-4 z-[60] grid h-9 w-9 place-items-center rounded-lg bg-white text-gray-600 shadow md:hidden"
          aria-label="ปิดเมนู"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
