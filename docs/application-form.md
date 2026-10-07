# The application form (ใบสมัครงาน)

The company's one-page paper form, filled in online at `/<locale>/application-form` (navbar: "กรอกใบสมัคร"),
listed for HR under **Admin › ผู้สมัคร › แบบฟอร์มใบสมัคร**, and printed back onto the company's blank form as a PDF.
Not tied to an application for a job (`applications`) — it is its own table, `application_forms` (migration 0005).

| Piece                              | Where                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| The fields (one zod schema)        | `lib/application-form/schema.ts` — wizard, API, DB, PDF                                        |
| The wizard (7 steps, progress bar) | `components/application-form/`                                                                 |
| API                                | `POST /api/v1/application-forms`, `/api/v1/admin/application-forms` (list, `{id}/pdf`, delete) |
| PDF                                | `lib/application-form/pdf.tsx`, positions in `layout.ts`                                       |
| Blank forms                        | `assets/application-form/{shd,rabbit,topone,plain}.pdf`                                        |
| Font                               | `assets/fonts/Sarabun-Regular.ttf` (SIL OFL, `OFL.txt`)                                        |

**Letterhead** — the applicant chooses the company (SHD, Rabbit, TOP ONE, or not set = the form without a logo).

**Sensitive data (PDPA s.26)** — ethnicity, religion, blood type, weight, height: optional, stored only when their own
consent box is ticked (the server drops them otherwise; a CHECK in the database refuses them without a consent time),
and printed only for admins with `applications.manage`. Everyone with `applications.view` can list and print the rest.

**The draft** stays in the browser tab (`sessionStorage`) until it is sent — not `localStorage`, because the form is also
filled in on shared devices at the office.

## How the PDF is made

Two layers: the original blank form, untouched, and a transparent page with the answers drawn by `@react-pdf/renderer`,
laid over it with `pdf-lib`. pdf-lib alone cannot shape Thai (tone marks go missing); react-pdf cannot open an existing
PDF. `ำ` is split into `ํ` + `า` before drawing (`splitSaraAm`) — react-pdf otherwise drops one character from the end
of the line per `ำ`.

The photo box and signature are left blank: the applicant signs and attaches a photo on the printed form.

## Replacing a blank form

The four templates share x positions; each is shifted down by `TEMPLATES[…].shift` in `layout.ts`. If a template
changes, re-measure: draw a ruler over it (pdf-lib, a tick every 10 pt on each row), render it, and read the dotted
lines' start and end off the image. `PREVIEW_DIR=/tmp/forms npx vitest run lib/application-form` writes the four filled
samples to look at.
