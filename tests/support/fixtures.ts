import type { Database } from '@/lib/db/client';
import { createRepositories } from '@/lib/repositories';
import type { ApplicationInput } from '@/lib/repositories/applications';
import type { JobInput } from '@/lib/repositories/jobs';
import { testDb } from './db';

/** The repositories over the test database. */
export const repos = createRepositories(testDb as unknown as Database);

export function jobInput(overrides: Partial<JobInput> = {}): JobInput {
  return {
    code: 'SHD-TH-OPS-001',
    publishState: 'PUBLISHED',
    countryCode: 'TH',
    department: 'Operations',
    level: 'Experienced',
    quantity: 2,
    translations: {
      th: { title: 'หัวหน้าทีม CS', location: 'กรุงเทพฯ', description: 'ดูแลทีม', qualifications: '3 ปีขึ้นไป' },
      en: { title: 'CS Team Lead', location: 'Bangkok', description: 'Lead the team', qualifications: '3+ years' },
    },
    ...overrides,
  };
}

export function applicationInput(overrides: Partial<ApplicationInput> = {}): ApplicationInput {
  return {
    locale: 'th',
    firstName: 'Somchai',
    lastName: 'Jaidee',
    email: 'somchai@example.com',
    phone: '+66 81 234 5678',
    residenceCountry: 'Thailand',
    address: null,
    visaRequired: false,
    availableFrom: '2026-11-01',
    websiteUrl: 'https://example.com/somchai',
    sourceChannel: 'LinkedIn',
    educations: [
      {
        level: 'BACHELOR',
        institute: 'Chulalongkorn',
        program: 'Engineering',
        startMonth: '2015-06',
        endMonth: '2019-05',
        gpa: '3.4',
      },
    ],
    experiences: [{ company: 'Acme', role: 'Agent', startMonth: '2019-07', endMonth: null }],
    skills: ['Excel', 'Customer Service'],
    files: [
      {
        kind: 'RESUME',
        storagePath: `applications/${crypto.randomUUID()}/resume.pdf`,
        fileName: 'resume.pdf',
        contentType: 'application/pdf',
        sizeBytes: 1234,
      },
    ],
    ...overrides,
  };
}

/** A published job and its pk, ready to apply to. */
export async function openJob(overrides: Partial<JobInput> = {}) {
  const job = await repos.jobs.create(jobInput(overrides), 'tester@shd');
  const pk = await repos.jobs.openJobPk(job.code);
  return { job, pk: pk! };
}
