# 🇬🇧 Getting started

The API of the SHD careers site. The public pages, the admin and any other system use this same API.

## Address

```
https://<domain>/api/v1/…
```

Every endpoint is under `/api/v1` and answers JSON (except the CSV export and file downloads).

## Two groups

| Group                      | Used by                     | Sign-in                                                                                                   |
| -------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Jobs**, **Site content** | the public site, applicants | none                                                                                                      |
| **Admin · …**              | the HR team                 | required (SSO — sign in at `/sso/login`; the `shd_careers_session` cookie; each endpoint's `Permission:`) |

## Applying

`POST /jobs/{code}/applications`, as `multipart/form-data`:

- Text fields as ordinary fields; educations, experiences and skills as **JSON strings**.
- Résumé (required) PDF/DOC/DOCX up to 5 MB · up to 5 more attachments, 10 MB each.
- File types are read from the **file contents**, not the name.
- 5 applications per 10 minutes per IP — beyond that, `429` with `Retry-After`.

## Errors

Every error has the same shape:

```json
{ "error": { "code": "bad_request", "message": "…", "issues": [{ "path": "email", "message": "…" }] } }
```

`issues` comes only on a `400` from validation: every field that is wrong, all at once.

| Status | code                | Meaning                                   |
| ------ | ------------------- | ----------------------------------------- |
| 400    | `bad_request`       | The input is not valid                    |
| 401    | `unauthorized`      | Not signed in                             |
| 403    | `forbidden`         | Signed in, not allowed                    |
| 404    | `not_found`         | No such thing (a draft or closed job too) |
| 409    | `conflict`          | Already exists, e.g. a job code           |
| 429    | `too_many_requests` | Too fast                                  |
| 503    | `unavailable`       | Something it depends on is not ready      |

Every response carries `x-request-id` — quote it when reporting a problem.
