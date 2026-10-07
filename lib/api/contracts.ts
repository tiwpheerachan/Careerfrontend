import { z } from 'zod';
import { endpoint } from './contract';
import * as S from './schemas';

/**
 * Every endpoint of /api/v1. Order here is the order in the docs.
 * Error responses common to a kind of endpoint are added by lib/api/openapi.ts.
 */

// --- System ----------------------------------------------------------------------------

export const health = endpoint({
  method: 'get',
  path: '/health',
  tag: 'System',
  summary: 'Is the database reachable',
  description: 'Runs a real query. Always 200 — an unreachable database is reported in the body, not as an error.',
  auth: 'public',
  responses: { 200: { description: 'Database status.', schema: S.Health } },
});

export const openapiJson = endpoint({
  method: 'get',
  path: '/openapi.json',
  tag: 'System',
  summary: 'This API as OpenAPI 3.0',
  description: 'Import into Bruno, Postman or a code generator.',
  auth: 'admin',
  responses: { 200: { description: 'The OpenAPI document.', schema: z.record(z.string(), z.unknown()) } },
});

// --- Public: jobs and the application form --------------------------------------------------

export const listJobs = endpoint({
  method: 'get',
  path: '/jobs',
  tag: 'Jobs',
  summary: 'Published jobs',
  description:
    'Newest first, in the asked language (each job falls back to another language when its translation is missing). `facets` lists every country, department and level among all published jobs — not only the ones matching the filter.',
  auth: 'public',
  query: S.PublicJobsQuery,
  responses: {
    200: {
      description: 'The jobs.',
      schema: z.object({ jobs: z.array(S.PublicJob), total: z.number().int(), facets: S.JobFacets }),
    },
  },
});

export const getJob = endpoint({
  method: 'get',
  path: '/jobs/{code}',
  tag: 'Jobs',
  summary: 'One published job',
  description: 'A draft or closed job is a 404.',
  auth: 'public',
  params: S.JobCodeParams,
  query: S.LocaleQuery,
  responses: { 200: { description: 'The job.', schema: z.object({ job: S.PublicJob }) } },
});

export const apply = endpoint({
  method: 'post',
  path: '/jobs/{code}/applications',
  tag: 'Jobs',
  summary: 'Apply for a job',
  description:
    'The application form, as multipart/form-data. Saved all-or-nothing. File types are checked from the file contents, not the name. Limited to 5 applications per 10 minutes per IP; when Turnstile is on, `turnstileToken` is required.',
  auth: 'public',
  params: S.JobCodeParams,
  body: { schema: S.ApplicationForm, type: 'multipart/form-data' },
  responses: {
    201: { description: 'Received.', schema: S.ApplicationCreated },
    429: { description: 'Too many applications from this address.', headers: { 'retry-after': 'Seconds to wait.' } },
  },
});

export const content = endpoint({
  method: 'get',
  path: '/content',
  tag: 'Site content',
  summary: 'Edited site text for one language',
  description: 'Only the keys the admin has changed; everything else is the built-in text.',
  auth: 'public',
  query: S.LocaleQuery,
  responses: { 200: { description: 'The overrides.', schema: S.ContentOverrides } },
});

// --- Admin: jobs ------------------------------------------------------------------------

export const adminListJobs = endpoint({
  method: 'get',
  path: '/admin/jobs',
  tag: 'Admin · Jobs',
  summary: 'All jobs',
  description: 'Every job that is not deleted, newest change first, with applicant counts.',
  auth: 'admin',
  permission: 'jobs.view',
  query: S.AdminJobsQuery,
  responses: { 200: { description: 'The jobs.', schema: z.object({ jobs: z.array(S.AdminJob) }) } },
});

export const adminCreateJob = endpoint({
  method: 'post',
  path: '/admin/jobs',
  tag: 'Admin · Jobs',
  summary: 'Create a job',
  auth: 'admin',
  permission: 'jobs.edit',
  body: { schema: S.JobInput, type: 'application/json' },
  responses: {
    201: { description: 'Created.', schema: z.object({ job: S.AdminJob }) },
    409: { description: 'A job with this code already exists.' },
  },
});

export const adminJobOptions = endpoint({
  method: 'get',
  path: '/admin/job-options',
  tag: 'Admin · Jobs',
  summary: 'Values in use, for autocomplete',
  auth: 'admin',
  permission: 'jobs.view',
  responses: { 200: { description: 'Distinct countries, departments and levels.', schema: S.JobFacets } },
});

export const adminGetJob = endpoint({
  method: 'get',
  path: '/admin/jobs/{id}',
  tag: 'Admin · Jobs',
  summary: 'One job',
  auth: 'admin',
  permission: 'jobs.view',
  params: S.IdParams,
  responses: { 200: { description: 'The job.', schema: z.object({ job: S.AdminJob }) } },
});

export const adminUpdateJob = endpoint({
  method: 'put',
  path: '/admin/jobs/{id}',
  tag: 'Admin · Jobs',
  summary: 'Replace a job',
  description: 'Every field is replaced; send the whole job.',
  auth: 'admin',
  permission: 'jobs.edit',
  params: S.IdParams,
  body: { schema: S.JobInput, type: 'application/json' },
  responses: {
    200: { description: 'Saved.', schema: z.object({ job: S.AdminJob }) },
    409: { description: 'Another job has this code.' },
  },
});

export const adminDeleteJob = endpoint({
  method: 'delete',
  path: '/admin/jobs/{id}',
  tag: 'Admin · Jobs',
  summary: 'Delete a job',
  description: 'Soft delete: the job is hidden, its applicants are kept, and its code is free again.',
  auth: 'admin',
  permission: 'jobs.manage',
  params: S.IdParams,
  responses: { 204: { description: 'Deleted.' } },
});

export const adminSetPublishState = endpoint({
  method: 'patch',
  path: '/admin/jobs/{id}/publish-state',
  tag: 'Admin · Jobs',
  summary: 'Publish, unpublish or close a job',
  auth: 'admin',
  permission: 'jobs.edit',
  params: S.IdParams,
  body: { schema: S.PublishStateInput, type: 'application/json' },
  responses: { 200: { description: 'Saved.', schema: z.object({ job: S.AdminJob }) } },
});

// --- Admin: applications ---------------------------------------------------------------

export const adminListApplications = endpoint({
  method: 'get',
  path: '/admin/applications',
  tag: 'Admin · Applications',
  summary: 'Applications, one page',
  description: 'Newest first.',
  auth: 'admin',
  permission: 'applications.view',
  query: S.AdminApplicationsQuery,
  responses: { 200: { description: 'One page.', schema: S.ApplicationList } },
});

export const adminExportApplications = endpoint({
  method: 'get',
  path: '/admin/applications/export',
  tag: 'Admin · Applications',
  summary: 'Download as CSV',
  description: 'Every match, same filters as the list (the job filter included). UTF-8 with BOM, opens in Excel.',
  auth: 'admin',
  permission: 'applications.manage',
  query: S.ExportQuery,
  responses: { 200: { description: 'The CSV file.', contentType: 'text/csv' } },
});

export const adminGetApplication = endpoint({
  method: 'get',
  path: '/admin/applications/{id}',
  tag: 'Admin · Applications',
  summary: 'One application, in full',
  auth: 'admin',
  permission: 'applications.view',
  params: S.IdParams,
  responses: { 200: { description: 'The application.', schema: z.object({ application: S.ApplicationDetail }) } },
});

export const adminDeleteApplication = endpoint({
  method: 'delete',
  path: '/admin/applications/{id}',
  tag: 'Admin · Applications',
  summary: 'Delete an application',
  description: 'Soft delete.',
  auth: 'admin',
  permission: 'applications.manage',
  params: S.IdParams,
  responses: { 204: { description: 'Deleted.' } },
});

export const adminSetStage = endpoint({
  method: 'patch',
  path: '/admin/applications/{id}/stage',
  tag: 'Admin · Applications',
  summary: 'Move to a hiring stage',
  description: 'Recorded in the stage history with who did it.',
  auth: 'admin',
  permission: 'applications.edit',
  params: S.IdParams,
  body: { schema: S.StageInput, type: 'application/json' },
  responses: {
    200: { description: 'The application as it now is.', schema: z.object({ application: S.ApplicationDetail }) },
  },
});

export const adminAddNote = endpoint({
  method: 'post',
  path: '/admin/applications/{id}/notes',
  tag: 'Admin · Applications',
  summary: 'Add a note',
  auth: 'admin',
  permission: 'applications.edit',
  params: S.IdParams,
  body: { schema: S.NoteInput, type: 'application/json' },
  responses: {
    201: {
      description: 'Added.',
      schema: z.object({ note: S.ApplicationDetail.shape.notes.element }),
    },
  },
});

export const adminDeleteNote = endpoint({
  method: 'delete',
  path: '/admin/applications/{id}/notes/{noteId}',
  tag: 'Admin · Applications',
  summary: 'Delete a note',
  auth: 'admin',
  permission: 'applications.edit',
  params: S.NoteParams,
  responses: { 204: { description: 'Deleted.' } },
});

export const adminDownloadFile = endpoint({
  method: 'get',
  path: '/admin/applications/{id}/files/{fileId}',
  tag: 'Admin · Applications',
  summary: 'Download a file',
  description: 'In production: a redirect to a signed link that works for 60 seconds. In development: the file itself.',
  auth: 'admin',
  permission: 'applications.view',
  params: S.FileParams,
  responses: {
    200: { description: 'The file (development).', contentType: 'application/octet-stream' },
    302: { description: 'Redirect to a short-lived signed link (production).', headers: { location: 'The link.' } },
  },
});

export const adminAnalytics = endpoint({
  method: 'get',
  path: '/admin/analytics',
  tag: 'Admin · Applications',
  summary: 'Dashboard numbers',
  description: 'Counted over every row. Days are Bangkok days.',
  auth: 'admin',
  permission: 'applications.view',
  query: S.AnalyticsQuery,
  responses: { 200: { description: 'The numbers.', schema: S.AnalyticsResponse } },
});

// --- Admin: site content ---------------------------------------------------------------

export const adminListContent = endpoint({
  method: 'get',
  path: '/admin/content',
  tag: 'Admin · Site content',
  summary: 'Edited keys for one language',
  auth: 'admin',
  permission: 'content.view',
  query: S.LocaleQuery,
  responses: { 200: { description: 'The overrides, with who changed each.', schema: S.ContentItems } },
});

export const adminSetContent = endpoint({
  method: 'put',
  path: '/admin/content',
  tag: 'Admin · Site content',
  summary: 'Set one key in one language',
  auth: 'admin',
  permission: 'content.edit',
  body: { schema: S.ContentInput, type: 'application/json' },
  responses: { 204: { description: 'Saved.' } },
});

export const adminRevertContent = endpoint({
  method: 'delete',
  path: '/admin/content',
  tag: 'Admin · Site content',
  summary: 'Back to the built-in text',
  auth: 'admin',
  permission: 'content.edit',
  query: S.ContentKeyQuery,
  responses: { 204: { description: 'Reverted.' } },
});

// --- The paper application form (ใบสมัครงาน) ---------------------------------------------------

export const submitApplicationForm = endpoint({
  method: 'post',
  path: '/application-forms',
  tag: 'Application form',
  summary: 'Send a filled-in application form',
  description:
    'The company’s one-page form (ใบสมัครงาน), from /application-form. Not tied to an application for a job. ' +
    'Rate limited per IP; Turnstile when it is on. `sensitive` is stored only with `sensitiveConsent: true`. ' +
    'Validation messages follow `?locale=`.',
  auth: 'public',
  query: S.LocaleQuery,
  body: { schema: S.ApplicationFormInput, type: 'application/json' },
  responses: { 201: { description: 'Received.', schema: S.ApplicationFormCreated } },
});

export const adminListApplicationForms = endpoint({
  method: 'get',
  path: '/admin/application-forms',
  tag: 'Admin · Applications',
  summary: 'Application forms sent from the site',
  description: 'Newest first.',
  auth: 'admin',
  permission: 'applications.view',
  query: S.AdminApplicationFormsQuery,
  responses: { 200: { description: 'One page.', schema: S.AdminApplicationFormsList } },
});

export const adminApplicationFormPdf = endpoint({
  method: 'get',
  path: '/admin/application-forms/{id}/pdf',
  tag: 'Admin · Applications',
  summary: 'The form as a PDF',
  description:
    'Printed onto the company’s blank form (its letterhead). The sensitive fields are filled only for ' +
    '`applications.manage`; with view they are left blank.',
  auth: 'admin',
  permission: 'applications.view',
  params: S.IdParams,
  responses: { 200: { description: 'One A4 page.', contentType: 'application/pdf' } },
});

export const adminDeleteApplicationForm = endpoint({
  method: 'delete',
  path: '/admin/application-forms/{id}',
  tag: 'Admin · Applications',
  summary: 'Delete an application form',
  description: 'Soft delete.',
  auth: 'admin',
  permission: 'applications.manage',
  params: S.IdParams,
  responses: { 204: { description: 'Deleted.' } },
});

export const ENDPOINTS = [
  health,
  openapiJson,
  listJobs,
  getJob,
  apply,
  submitApplicationForm,
  content,
  adminListJobs,
  adminCreateJob,
  adminJobOptions,
  adminGetJob,
  adminUpdateJob,
  adminDeleteJob,
  adminSetPublishState,
  adminListApplications,
  adminExportApplications,
  adminGetApplication,
  adminDeleteApplication,
  adminSetStage,
  adminAddNote,
  adminDeleteNote,
  adminDownloadFile,
  adminListApplicationForms,
  adminApplicationFormPdf,
  adminDeleteApplicationForm,
  adminAnalytics,
  adminListContent,
  adminSetContent,
  adminRevertContent,
];

export const TAGS = [
  { name: 'System', description: 'Health and this document.' },
  { name: 'Jobs', description: 'The public site: published jobs and the application form. No sign-in.' },
  { name: 'Application form', description: 'The company’s paper application form, filled in online. No sign-in.' },
  { name: 'Site content', description: 'Text the admin has edited.' },
  { name: 'Admin · Jobs', description: 'Create and manage jobs.' },
  { name: 'Admin · Applications', description: 'Review applicants.' },
  { name: 'Admin · Site content', description: 'Edit the site’s text.' },
];
