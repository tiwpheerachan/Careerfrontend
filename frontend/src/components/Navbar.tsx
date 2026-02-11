import React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { cn } from "@/lib/cn";
import { Menu, X } from "lucide-react";

function NavItem({
  to,
  label,
  scrolled,
}: {
  to: string;
  label: string;
  scrolled: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
          scrolled ? "text-white/90" : "text-white/90",
          scrolled ? "hover:bg-white/10" : "hover:bg-black/10",
          isActive ? "bg-white/14 text-white" : "bg-transparent"
        )
      }
      style={
        scrolled
          ? {
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }
          : undefined
      }
    >
      {label}
    </NavLink>
  );
}

export default function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();

  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ✅ ปิดเมนูเมื่อเปลี่ยนหน้า (สำคัญมาก)
  React.useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // ✅ ESC ปิดเมนู
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ✅ กันเมนูค้างตอน rotate/resize
  React.useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  return (
    <header className="fixed top-0 z-50 w-full">
      {/* ✅ Wrapper: ให้ header เองไม่กิน pointer-events */}
      <div className="pointer-events-none mx-auto w-full px-3 pt-3 sm:px-4">
        {/* ✅ bar กลาง: pointer-events กลับมา auto เฉพาะส่วนที่กดได้ */}
        <div
          className={cn(
            "pointer-events-auto mx-auto flex w-full items-center justify-between gap-3",
            "transition-all duration-300 ease-out",
            scrolled ? "max-w-[1080px]" : "max-w-[1180px]"
          )}
        >
          <div
            className={cn(
              "flex w-full items-center justify-between gap-3",
              "transition-all duration-300 ease-out",
              scrolled
                ? "rounded-[999px] bg-black/55 backdrop-blur-xl ring-1 ring-white/12 shadow-[0_22px_80px_rgba(0,0,0,0.35)] px-4 py-2"
                : "rounded-[999px] bg-transparent px-2 py-2"
            )}
          >
            {/* LOGO */}
            <Link to="/" className="flex items-center gap-3">
              <img
                src="https://image.makewebcdn.com/makeweb/m_1920x0/hvIRoKhSo/DefaultData/logo_2x.png"
                alt="SHD"
                className={cn("w-auto transition-all duration-300", scrolled ? "h-8" : "h-9")}
                style={{
                  filter: scrolled
                    ? "drop-shadow(0 10px 22px rgba(0,0,0,0.30))"
                    : "drop-shadow(0 14px 32px rgba(0,0,0,0.40))",
                }}
              />
            </Link>

            {/* DESKTOP NAV */}
            <nav className="hidden md:flex items-center gap-2">
              <NavItem to="/about" label={t("nav.about")} scrolled={scrolled} />
              <NavItem to="/why-shd" label={t("nav.why")} scrolled={scrolled} />
              <NavItem to="/jobs" label={t("nav.jobs")} scrolled={scrolled} />
              <NavItem to="/partners" label={t("nav.partners")} scrolled={scrolled} />
            </nav>

            {/* RIGHT */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center text-white/90">
                <LanguageSwitcher className="!bg-transparent !border-0 !shadow-none !p-0 !text-white/90" />
              </div>

              <Link
                to="/jobs"
                className={cn(
                  "hidden sm:inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-extrabold transition",
                  "hover:-translate-y-0.5 active:translate-y-0",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                )}
                style={
                  scrolled
                    ? {
                        background: "rgba(255,255,255,0.14)",
                        color: "rgba(255,255,255,0.95)",
                        border: "1px solid rgba(255,255,255,0.18)",
                        boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
                      }
                    : {
                        background: "rgba(255,255,255,0.92)",
                        color: "rgba(0,0,0,0.88)",
                        boxShadow: "0 18px 56px rgba(0,0,0,0.28)",
                      }
                }
              >
                Find jobs
              </Link>

              {/* MOBILE MENU */}
              <div className="md:hidden">
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-3 py-2 transition",
                    "text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  )}
                  aria-label="Menu"
                  aria-expanded={open}
                >
                  {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ สำคัญ: ทำ dropdown ให้อยู่แบบ ABSOLUTE (ไม่กินความสูง header) */}
        <div className="pointer-events-none relative mx-auto w-full" style={{ maxWidth: scrolled ? 1080 : 1180 }}>
          {/* Overlay (คลิกปิด) */}
          <div
            className={cn(
              "fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] transition",
              open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className={cn(
              "absolute left-0 right-0 top-full z-50 mt-3 md:hidden",
              open ? "pointer-events-auto" : "pointer-events-none"
            )}
          >
            <div
              className={cn(
                "rounded-3xl bg-black/70 backdrop-blur-xl ring-1 ring-white/12 shadow-[0_28px_90px_rgba(0,0,0,0.40)] p-4",
                "transition-all duration-200",
                open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
              )}
            >
              <div className="mb-3 text-white/90">
                <LanguageSwitcher className="!bg-transparent !border-0 !shadow-none !text-white/90" />
              </div>

              <div className="flex flex-col gap-2">
                {[
                  { k: "about", path: "/about" },
                  { k: "why", path: "/why-shd" },
                  { k: "jobs", path: "/jobs" },
                  { k: "partners", path: "/partners" },
                ].map((x) => (
                  <Link
                    key={x.k}
                    to={x.path}
                    onClick={() => setOpen(false)}
                    className="rounded-2xl px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
                  >
                    {t(`nav.${x.k}`)}
                  </Link>
                ))}
              </div>

              <div className="mt-4">
                <Link
                  to="/jobs"
                  onClick={() => setOpen(false)}
                  className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-extrabold"
                  style={{
                    background: "rgba(255,255,255,0.14)",
                    color: "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(255,255,255,0.18)",
                  }}
                >
                  Find jobs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* กัน content โดนทับ */}
      <div className="h-[76px]" />
    </header>
  );
}
