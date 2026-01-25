import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>404 • SHD Careers</title>
      </Helmet>
      <section className="container-page py-16">
        <div className="card p-10">
          <h1 className="text-2xl font-black">404</h1>
          <p className="mt-2 text-sm text-slate-600">{t("common.notFound")}</p>
          <div className="mt-6">
            <Link to="/" className="btn btn-primary">
              {t("common.back")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
