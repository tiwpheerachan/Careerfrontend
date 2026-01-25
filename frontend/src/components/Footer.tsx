import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-page py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-sm font-black tracking-tight">SHD Careers</div>
            <div className="mt-2 text-sm text-slate-600">
              Global recruitment experience with multi-language support.
            </div>
          </div>

          <div className="text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Navigation</div>
            <ul className="mt-2 space-y-1">
              <li>{t("nav.about")}</li>
              <li>{t("nav.why")}</li>
              <li>{t("nav.jobs")}</li>
              <li>{t("nav.partners")}</li>
            </ul>
          </div>

          <div className="text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Contact</div>
            <div className="mt-2 space-y-1">
              <div>Email: careers@shd-technology.co.th</div>
              <div>© {year} SHD Technology</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
