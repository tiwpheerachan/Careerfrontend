'use client';

import { FileText, Loader2, Trash2, Upload, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { AdminApiError, adminFetch } from '@/lib/admin/client';
import { FIELD, Labeled } from './fields';

/** The résumé's rules, as the API checks them (lib/files.ts FILE_RULES.RESUME): PDF, DOC or DOCX, ≤ 5 MB. */
const RESUME_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const RESUME_MAX = 5 * 1024 * 1024;

/**
 * Adding a candidate who has no application yet (POST /admin/interview-candidates):
 * then to their page, to invite and evaluate them. The résumé is optional.
 */
export function AddCandidateForm() {
  const t = useTranslations('interviews.pending');
  const router = useRouter();
  const [fields, setFields] = useState({ name: '', position: '', department: '', phone: '' });
  const [resume, setResume] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
    setErrors(({ [key]: _, ...rest }) => rest);
  };

  const pickResume = (file: File | null) => {
    if (fileRef.current) fileRef.current.value = '';
    if (file && file.size > RESUME_MAX) return setErrors((e) => ({ ...e, resume: t('resumeTooLarge') }));
    setErrors(({ resume: _, ...rest }) => rest);
    setResume(file);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!fields.name.trim()) found.name = t('required');
    if (fields.phone.replace(/\D/g, '').length < 9) found.phone = t('phoneInvalid');
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const body = new FormData();
      body.append('data', JSON.stringify(fields));
      if (resume) body.append('resume', resume);
      const { id } = await adminFetch<{ id: string }>('/interview-candidates', { method: 'POST', body });
      toast.success(t('added'));
      router.push(`/admin/interviews/candidate/${encodeURIComponent(`pending:${id}`)}`);
    } catch (error) {
      if (error instanceof AdminApiError && error.issues.length) {
        setErrors(
          Object.fromEntries(
            error.issues.map((i) => [
              i.path,
              i.path === 'resume' ? t('resumeInvalid') : i.path === 'phone' ? t('phoneInvalid') : t('required'),
            ]),
          ),
        );
      }
      toast.error(error instanceof AdminApiError ? error.message : t('failed'));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-4 p-6" noValidate>
      <Labeled label={t('name')} htmlFor="pc-name" error={errors.name} required>
        <Input
          id="pc-name"
          value={fields.name}
          onChange={set('name')}
          maxLength={150}
          aria-invalid={!!errors.name || undefined}
          className={FIELD}
        />
      </Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label={t('position')} htmlFor="pc-position">
          <Input
            id="pc-position"
            value={fields.position}
            onChange={set('position')}
            maxLength={150}
            className={FIELD}
          />
        </Labeled>
        <Labeled label={t('department')} htmlFor="pc-department">
          <Input
            id="pc-department"
            value={fields.department}
            onChange={set('department')}
            maxLength={150}
            className={FIELD}
          />
        </Labeled>
      </div>
      <Labeled label={t('phone')} htmlFor="pc-phone" error={errors.phone} required>
        <Input
          id="pc-phone"
          type="tel"
          inputMode="tel"
          value={fields.phone}
          onChange={set('phone')}
          maxLength={20}
          aria-invalid={!!errors.phone || undefined}
          aria-describedby="pc-phone-hint"
          className={FIELD}
        />
        <p id="pc-phone-hint" className="mt-1 text-xs text-gray-500">
          {t('phoneHint')}
        </p>
      </Labeled>
      <Labeled label={t('resume')} htmlFor="pc-resume" error={errors.resume}>
        {resume ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2 text-gray-800">
              <FileText className="h-4 w-4 shrink-0 text-gray-500" />
              <span className="truncate">{resume.name}</span>
            </span>
            <button
              type="button"
              onClick={() => pickResume(null)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t('remove')}
            </button>
          </div>
        ) : (
          <label
            htmlFor="pc-resume"
            className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-3 py-3 text-sm text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500"
          >
            <Upload className="h-4 w-4 text-blue-600" /> {t('resumePick')}
            <input
              id="pc-resume"
              ref={fileRef}
              type="file"
              accept={RESUME_ACCEPT}
              className="sr-only"
              onChange={(e) => pickResume(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
        <p className="mt-1 text-xs text-gray-500">{t('resumeHint')}</p>
      </Labeled>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {saving ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  );
}
