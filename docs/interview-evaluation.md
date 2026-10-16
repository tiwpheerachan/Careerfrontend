# Interview evaluation (แบบประเมินผลสัมภาษณ์)

The company's interview appraisal form (HR, hiring-department and Chinese 面试评估表 versions), in the admin:
**Admin › ประเมินสัมภาษณ์**. Admin only — evaluations are internal. Permissions are the `applications` resource:
view reads everything and prints, edit evaluates and changes one's own, manage changes any and deletes.

| Piece                   | Where                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Items, scale, pass mark | `lib/interview/scoring.ts` (shared by the form and the server)                         |
| Input schema            | `lib/interview/schema.ts`                                                              |
| Table                   | `interview_evaluations`, migration 0006                                                |
| API                     | `/api/v1/admin/interview-evaluations` (+ `{id}`, `pdf`), `/admin/interview-candidates` |
| Admin pages             | `app/admin/interviews/` — list, new, one evaluation, one candidate                     |
| PDF                     | `lib/interview/pdf.tsx`; logo `assets/interview/shd-logo.png`                          |

**Candidates without an application yet** (migration 0013, `interview_candidates`). Applicants usually fill in the
form after the interview, so HR (applications.edit) adds them first at **Admin › ประเมินสัมภาษณ์ › เพิ่มผู้สมัคร**: name,
position, department, phone (HR only — never shown to an invited evaluator) and an optional résumé. Their key is
`pending:<id>`; they are invited and evaluated like anyone else, and an invitee sees "no application yet" and the résumé.
Once the form or application exists, the candidate page suggests the likely ones (same name or phone) and HR links it
(`POST /admin/interview-candidates/{id}/link`): every evaluation and invitation becomes the form's or application's, in
one transaction, once (409 after, and 409 if one evaluator scored the same round and side of both). The old key then
redirects to the new one.

**One row = one evaluator × one round.** The candidate is an application, an application form, or typed in by hand;
evaluations of the same person are grouped by `lib/interview/candidate-key.ts` (`application:<id>`, `form:<id>`,
`pending:<id>`, `name:<name>` — case- and space-insensitive for typed-in names). The evaluator is the signed-in SSO user, never typed.

**Scoring.** Items 1–10 (0–5 each, out of 50) for everyone; items 11–15 (out of 25) for Senior positions and above.
Pass mark: ≥ 40; Senior: items 11–15 **over 20** and all fifteen ≥ 60 (the Thai form's "เกิน 20", chosen over the
Chinese "20分以上"). It is shown as a recommendation — the evaluator still picks pending / pass / fail. CHECKs in the
database keep the scores 0–5, the counts right, and the stored totals equal to the scores.

**What an invited evaluator sees** (`/evaluate/{token}`, `components/admin/interviews/candidate-materials.tsx`). For an
application: its files, education, experience and skills. For an application form: the photo, the résumé
(`/evaluate/{token}/resume`) and the work profile — education, the jobs without salary, benefits or reason for leaving,
languages, computer, typing, licences. The form's PDF (`/evaluate/{token}/application-form`) only on an **HR** link: a
hiring-department link gets 403 there, because the form has the salaries and personal details that are HR's alone.

**PDF.** Two pages per candidate and side (HR / department), rounds 1 and 2 side by side, each the latest evaluation of
that round: the scores, then **สรุปผลการประเมิน** — each round's comment first (lines to write on where there is none),
then the verdicts and signatures, kept together. With several evaluators, each gets their own two pages after the summary.
Thai, English or Chinese. Rebuilt after the Word original (there is no blank PDF to print onto). Fonts:
Sarabun (Thai, Latin) with Noto Sans SC as a per-glyph fallback for Chinese (`assets/fonts`, both SIL OFL). Every
string goes through `splitSaraAm` (`lib/pdf/thai.ts`) — react-pdf otherwise drops characters after `ำ`.

`PREVIEW_DIR=/tmp/out npx vitest run lib/interview/pdf.test.ts` writes the three sample PDFs to look at.
