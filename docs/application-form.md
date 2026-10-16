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
| Photo                              | `application_forms.photo_path` (migration 0012), box per template in `TEMPLATES[…].photo`      |
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

**The photo** is required by the wizard (not by the API, so a form without one still prints with the box empty). The
browser crops it to the box's 4:5 and redraws it as a 640×800 JPEG before it is sent — upright (EXIF orientation applied),
~100 KB, and without its EXIF (GPS). It stays in the draft as a data URL, so a refresh keeps it. The PDF draws it into
`TEMPLATES[letterhead].photo` cropped to cover the box; it is printed on the redacted copy too (an interviewer needs to
know who they are meeting). The signature is left blank: the applicant signs on the printed form.

**Languages** (9.1) are up to three rows — English, Chinese, another named — printed on the form's one line in the same
order on each part ("อังกฤษ / จีน", "ดี / พอใช้"). A form sent before kept one typed `skills.language`; `languagesOf()`
prints either.

## Replacing a blank form

The four templates share x positions; each is shifted down by `TEMPLATES[…].shift` in `layout.ts`. If a template
changes, re-measure: draw a ruler over it (pdf-lib, a tick every 10 pt on each row), render it, and read the dotted
lines' start and end off the image. `PREVIEW_DIR=/tmp/forms npx vitest run lib/application-form` writes the four filled
samples to look at.
