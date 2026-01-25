import React from "react";
import { NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { cn } from "@/lib/cn";

const COLORS = {
  inkGold: "#987131",   // start text
  barGold: "#fcecdf",   // scrolled bg
  barText: "#573f20",   // scrolled text
  cta: "#a99260",       // Find jobs
};

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
      className="px-2 py-1 text-sm font-semibold transition"
      style={({ isActive }) =>
        !scrolled
          ? {
              color: COLORS.inkGold,
              background: "transparent",
            }
          : {
              color: COLORS.barText,
              background: "transparent",
              borderBottom: isActive
                ? "2px solid rgba(87,63,32,0.55)"
                : "2px solid transparent",
            }
      }
    >
      {label}
    </NavLink>
  );
}

export default function Navbar() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 w-full transition-all duration-300"
      style={
        scrolled
          ? {
              backgroundColor: "rgba(252,236,223,0.75)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderBottom: "1px solid rgba(87,63,32,0.18)",
            }
          : {
              backgroundColor: "transparent",
              borderBottom: "1px solid transparent",
            }
      }
    >
      <div className="container-page flex h-16 items-center justify-between">
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src="https://image.makewebcdn.com/makeweb/m_1920x0/hvIRoKhSo/DefaultData/logo_2x.png"
            alt="SHD"
            className="h-9 w-auto"
            style={{
              filter: scrolled
                ? "drop-shadow(0 6px 16px rgba(0,0,0,0.18))"
                : "drop-shadow(0 8px 22px rgba(0,0,0,0.30))",
            }}
          />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-6">
          <NavItem to="/about" label={t("nav.about")} scrolled={scrolled} />
          <NavItem to="/why-shd" label={t("nav.why")} scrolled={scrolled} />
          <NavItem to="/jobs" label={t("nav.jobs")} scrolled={scrolled} />
          <NavItem to="/partners" label={t("nav.partners")} scrolled={scrolled} />
        </nav>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          {/* Language (no box) */}
          <div
            className="hidden sm:flex items-center"
            style={{
              color: scrolled ? COLORS.barText : COLORS.inkGold,
            }}
          >
            <LanguageSwitcher className="!bg-transparent !border-0 !shadow-none !p-0" />
          </div>

          {/* Find jobs CTA */}
          <Link
            to="/jobs"
            className="hidden sm:inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-extrabold transition hover:-translate-y-0.5"
            style={{
              backgroundColor: COLORS.cta,
              color: "#fffaf3",
              boxShadow: scrolled
                ? "0 12px 36px rgba(0,0,0,0.18)"
                : "0 18px 56px rgba(0,0,0,0.30)",
            }}
          >
            Find jobs
          </Link>

          {/* MOBILE MENU */}
          <div className="md:hidden">
            <details className="relative">
              <summary
                className="list-none cursor-pointer text-sm font-semibold"
                style={{
                  color: scrolled ? COLORS.barText : COLORS.inkGold,
                }}
              >
                Menu
              </summary>

              <div
                className="absolute right-0 mt-3 w-64 rounded-2xl p-4"
                style={{
                  backgroundColor: scrolled
                    ? "rgba(252,236,223,0.95)"
                    : "rgba(20,20,20,0.65)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  boxShadow: "0 28px 90px rgba(0,0,0,0.35)",
                }}
              >
                <div
                  className="mb-3"
                  style={{ color: scrolled ? COLORS.barText : "#f6e7d2" }}
                >
                  <LanguageSwitcher className="!bg-transparent !border-0 !shadow-none" />
                </div>

                <div className="flex flex-col gap-2">
                  {["about", "why", "jobs", "partners"].map((k) => (
                    <Link
                      key={k}
                      to={`/${k === "why" ? "why-shd" : k}`}
                      className="text-sm font-semibold"
                      style={{
                        color: scrolled ? COLORS.barText : "#f6e7d2",
                      }}
                    >
                      {t(`nav.${k}`)}
                    </Link>
                  ))}
                </div>

                <div className="mt-4">
                  <Link
                    to="/jobs"
                    className="inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-extrabold"
                    style={{
                      backgroundColor: COLORS.cta,
                      color: "#fffaf3",
                    }}
                  >
                    Find jobs
                  </Link>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
