/**
 * The fixed choices of the application form. The values are what is sent to
 * the API (and what HR reads); the labels come from messages (apply.*).
 */

/** Residence countries — the old form's list. `key` → apply.countries.<key>; `value` is stored. */
export const RESIDENCE_COUNTRIES = [
  { key: 'Thailand', value: 'Thailand' },
  { key: 'China', value: 'China' },
  { key: 'Indonesia', value: 'Indonesia' },
  { key: 'Philippines', value: 'Philippines' },
  { key: 'Vietnam', value: 'Vietnam' },
  { key: 'Brazil', value: 'Brazil' },
  { key: 'Mexico', value: 'Mexico' },
  { key: 'SaudiArabia', value: 'Saudi Arabia' },
  { key: 'UAE', value: 'United Arab Emirates (Dubai)' },
  { key: 'Other', value: 'Other' },
] as const;

export const OTHER_COUNTRY = 'Other';

/** Phone country codes. `iso` → apply.phoneCodes.<iso>. */
export const PHONE_CODES = [
  { iso: 'TH', code: '+66' },
  { iso: 'CN', code: '+86' },
  { iso: 'ID', code: '+62' },
  { iso: 'PH', code: '+63' },
  { iso: 'VN', code: '+84' },
  { iso: 'BR', code: '+55' },
  { iso: 'MX', code: '+52' },
  { iso: 'SA', code: '+966' },
  { iso: 'AE', code: '+971' },
] as const;

/**
 * Skill groups. The values are the old form's English names — what is sent,
 * whatever the page language — and line up one-to-one with the translated
 * labels in apply.skills.groups.<key>.items.
 */
export const SKILL_GROUPS = [
  {
    key: 'office',
    values: [
      'Excel',
      'Google Sheets',
      'PowerPoint',
      'Word',
      'Data Entry',
      'Documentation',
      'Reporting',
      'Presentation',
      'Email Communication',
      'Calendar & Scheduling',
    ],
  },
  {
    key: 'customer',
    values: [
      'Customer Service',
      'Sales Support',
      'Operations',
      'Process Improvement',
      'Logistics',
      'Inventory Management',
      'Order Management',
      'Vendor Management',
      'Quality Assurance',
      'Problem Solving',
    ],
  },
  {
    key: 'data',
    values: [
      'Data Analytics',
      'SQL',
      'Python',
      'Power BI',
      'Tableau',
      'Google Looker Studio',
      'A/B Testing',
      'Forecasting',
      'Dashboarding',
      'KPI Tracking',
    ],
  },
  {
    key: 'engineering',
    values: [
      'JavaScript',
      'TypeScript',
      'React',
      'Next.js',
      'Node.js',
      'REST APIs',
      'Git',
      'Testing',
      'CI/CD',
      'System Design',
    ],
  },
  {
    key: 'business',
    values: [
      'Project Management',
      'Stakeholder Management',
      'Communication',
      'Leadership',
      'Teamwork',
      'Time Management',
      'Negotiation',
      'Public Speaking',
      'Business Analysis',
      'Strategy',
    ],
  },
  {
    key: 'ecommerce',
    values: [
      'E-commerce',
      'Shopee',
      'Lazada',
      'TikTok Shop',
      'Product Listing',
      'Ads Optimization',
      'SEO',
      'Content Writing',
      'Social Media',
      'Campaign Planning',
    ],
  },
] as const;

export type SkillGroupKey = (typeof SKILL_GROUPS)[number]['key'];

export const MAX_SKILLS = 8;
export const MAX_EDUCATIONS = 5;
export const MAX_EXPERIENCES = 20;
