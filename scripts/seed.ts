/**
 * Sample data for a development database — `npm run db:dev:seed`.
 *
 * Idempotent: a job whose code already exists is skipped along with its
 * sample applicants, so running it twice changes nothing. Never offered
 * against production (scripts/db.mjs), and refuses a non-local database by
 * itself too.
 *
 * Every person here is made up; every email is @example.com.
 */
import { assertMayTouch, targetLabel } from './db-target.mjs';
import { createDatabase } from '@/lib/db/client';
import { createRepositories } from '@/lib/repositories';
import type { ApplicationInput } from '@/lib/repositories/applications';
import type { JobInput } from '@/lib/repositories/jobs';
import type { ApplicationStage } from '@/lib/db/schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set.');
const target = assertMayTouch(url, 'seed');

const JOBS: JobInput[] = [
  {
    code: 'SHD-TH-OPS-LEAD-001',
    publishState: 'PUBLISHED',
    countryCode: 'TH',
    department: 'Operations',
    level: 'Experienced',
    quantity: 2,
    translations: {
      th: {
        title: 'หัวหน้าทีมบริการลูกค้า (Shopee)',
        location: 'กรุงเทพฯ ประเทศไทย',
        description: 'นำและโค้ชทีมบริการลูกค้าให้มอบประสบการณ์ที่ดีแก่ลูกค้า ดูแล KPI คุณภาพ และเคสที่ต้องยกระดับ',
        qualifications:
          'ประสบการณ์งานบริการลูกค้า 3 ปีขึ้นไป\nมีภาวะผู้นำและการสื่อสารที่ดี\nเคยทำงาน e-commerce จะพิจารณาเป็นพิเศษ',
      },
      en: {
        title: 'CS Team Lead (Shopee)',
        location: 'Bangkok, Thailand',
        description:
          'Lead and coach the customer service team to deliver excellent customer experience. Manage KPIs, quality, and escalation handling.',
        qualifications:
          '3+ years in customer service operations.\nStrong leadership and communication skills.\nFamiliar with e-commerce is a plus.',
      },
      zh: {
        title: '客服组长（Shopee）',
        location: '泰国曼谷',
        description: '带领并辅导客服团队，提供优质的客户体验。负责 KPI、质量及升级处理。',
        qualifications: '3 年以上客服运营经验。\n具备领导力和良好沟通能力。\n熟悉电商者优先。',
      },
    },
  },
  {
    code: 'SHD-PH-CS-SENIOR-002',
    publishState: 'PUBLISHED',
    countryCode: 'PH',
    department: 'Customer Service',
    level: 'Senior',
    quantity: 1,
    translations: {
      en: {
        title: 'Customer Service Supervisor',
        location: 'Manila, Philippines',
        description:
          'Supervise CS operations, ensure service levels, and coordinate cross-functional teams for issue resolution.',
        qualifications: '2+ years as team supervisor.\nStrong analytical skills and stakeholder management.',
      },
    },
  },
  {
    code: 'SHD-VN-ENG-JUNIOR-003',
    publishState: 'PUBLISHED',
    countryCode: 'VN',
    department: 'Engineering and Technology',
    level: 'Entry Level',
    quantity: 3,
    translations: {
      en: {
        title: 'Frontend Engineer',
        location: 'Ho Chi Minh City, Vietnam',
        description:
          'Build responsive web experiences. Work with product and design to ship features quickly and reliably.',
        qualifications: 'React/TypeScript experience.\nGood fundamentals in HTML/CSS.\nBonus: Next.js, TailwindCSS.',
      },
      th: {
        title: 'Frontend Engineer',
        location: 'โฮจิมินห์ซิตี้ เวียดนาม',
        description: 'พัฒนาเว็บที่รองรับทุกอุปกรณ์ ทำงานร่วมกับทีมโปรดักต์และดีไซน์',
        qualifications: 'มีประสบการณ์ React/TypeScript\nพื้นฐาน HTML/CSS ดี',
      },
    },
  },
  {
    code: 'SHD-TH-HRBP-004',
    publishState: 'DRAFT',
    countryCode: 'TH',
    department: 'Human Resources',
    level: 'Experienced',
    quantity: 1,
    translations: {
      th: {
        title: 'HR Business Partner',
        location: 'กรุงเทพฯ',
        description: 'ร่างประกาศ — ยังไม่เผยแพร่',
        qualifications: null,
      },
    },
  },
];

const PEOPLE: Array<[string, string, ApplicationStage]> = [
  ['Somchai', 'Jaidee', 'NEW'],
  ['Mali', 'Srisuk', 'REVIEWING'],
  ['Juan', 'Dela Cruz', 'SHORTLISTED'],
  ['Nguyen', 'Van An', 'REJECTED'],
  ['Kanya', 'Thongdee', 'HIRED'],
];

function applicant(first: string, last: string, i: number): ApplicationInput {
  const slug = `${first}.${last}`.toLowerCase().replace(/\s+/g, '');
  return {
    locale: i % 2 ? 'en' : 'th',
    firstName: first,
    lastName: last,
    email: `${slug}@example.com`,
    phone: `+66 80 000 00${i}${i}`,
    residenceCountry: 'Thailand',
    address: null,
    visaRequired: i === 2,
    availableFrom: '2026-12-01',
    websiteUrl: i % 2 ? `https://example.com/${slug}` : null,
    sourceChannel: ['LinkedIn', 'JobsDB', 'Facebook', 'Referral', 'Company website'][i % 5]!,
    educations: [
      {
        level: 'BACHELOR',
        institute: 'Sample University',
        program: 'Business Administration',
        startMonth: '2016-06',
        endMonth: '2020-05',
        gpa: '3.2',
      },
    ],
    experiences: [{ company: 'Sample Co.', role: 'Customer Service Agent', startMonth: '2020-07', endMonth: null }],
    skills: ['Customer Service', 'Excel', 'Communication'],
    // No files: the sample has nothing in storage to point at.
    files: [],
  };
}

const db = createDatabase(url, { max: 2 });
const repos = createRepositories(db);

try {
  console.log(`Seeding ${targetLabel(target)}`);
  const existing = new Set((await repos.jobs.list()).map((j) => j.code));

  for (const input of JOBS) {
    if (existing.has(input.code)) {
      console.log(`  = ${input.code} (already there, skipped)`);
      continue;
    }
    const job = await repos.jobs.create(input, 'seed');
    console.log(`  + ${job.code} ${job.publishState}`);

    const pk = await repos.jobs.openJobPk(job.code);
    if (!pk) continue; // drafts take no applicants
    for (const [i, [first, last, stage]] of PEOPLE.entries()) {
      const { id } = await repos.applications.create(pk, applicant(first, last, i));
      if (stage !== 'NEW') await repos.applications.setStage(id, stage, 'seed');
      if (stage === 'SHORTLISTED') await repos.applications.addNote(id, 'Strong interview. Schedule round 2.', 'seed');
    }
    console.log(`    ${PEOPLE.length} sample applicants`);
  }

  // site_content stays empty: the defaults in messages/*.json are the seed.
  console.log('Done.');
} finally {
  await db.$client.end();
}
