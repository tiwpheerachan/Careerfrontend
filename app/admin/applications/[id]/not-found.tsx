import { ArrowLeft, UserX } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** An applicant that does not exist (or was deleted). */
export default async function ApplicationNotFound() {
  const t = await getTranslations('applications.detail');
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xs">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-gray-100 text-gray-400">
        <UserX className="h-5 w-5" />
      </div>
      <h1 className="mt-4 text-xl font-black tracking-tight text-gray-900">{t('notFoundTitle')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('notFoundBody')}</p>
      <Link
        href="/admin/applications"
        className="mt-6 inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
      >
        <ArrowLeft className="h-4 w-4" /> {t('back')}
      </Link>
    </div>
  );
}
