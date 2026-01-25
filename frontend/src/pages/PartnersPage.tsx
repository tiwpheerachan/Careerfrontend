import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

export default function PartnersPage() {
  const { t } = useTranslation();
  const list = t("partners.list", { returnObjects: true }) as { name: string; desc: string }[];

  return (
    <>
      <Helmet>
        <title>{t("nav.partners")} • SHD Careers</title>
      </Helmet>

      <section className="container-page py-12">
        <h1 className="text-2xl font-black tracking-tight">{t("partners.title")}</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">{t("partners.p1")}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {list.map((p) => (
            <div key={p.name} className="card p-6">
              <div className="text-sm font-black">{p.name}</div>
              <div className="mt-2 text-sm text-slate-600">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
