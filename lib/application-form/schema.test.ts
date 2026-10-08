import { describe, expect, it } from 'vitest';
import { applicationFormInput } from '@/tests/support/application-form';
import { ApplicationFormInput } from './schema';

const withField = (fields: Record<string, unknown>) =>
  ApplicationFormInput.safeParse({ ...applicationFormInput(), ...fields });

describe('the application form: phone numbers', () => {
  it.each(['081-234-5678', '0812345678', '02 123 4567', '+66 81 234 5678', '(02) 123-4567'])('takes %s', (mobile) => {
    expect(withField({ mobile }).success).toBe(true);
  });

  it.each(['sdfsdf', '081-abc-5678', '12345', '081', '+66 81 234 5678 9999 1'])('refuses %s', (mobile) => {
    expect(withField({ mobile }).success).toBe(false);
  });

  it('home phone: optional, but a phone when given', () => {
    expect(withField({ homePhone: '' }).success).toBe(true);
    expect(withField({ homePhone: 'sdfsdf' }).success).toBe(false);
  });
});

describe('the application form: expected salary, a range in baht', () => {
  it('either end, both, or neither; the top not below the bottom', () => {
    expect(withField({ expectedSalaryMin: 25000, expectedSalaryMax: 30000 }).success).toBe(true);
    expect(withField({ expectedSalaryMin: 25000, expectedSalaryMax: null }).success).toBe(true);
    expect(withField({ expectedSalaryMin: null, expectedSalaryMax: null }).success).toBe(true);
    expect(withField({ expectedSalaryMin: 30000, expectedSalaryMax: 30000 }).success).toBe(true);
    const below = withField({ expectedSalaryMin: 30000, expectedSalaryMax: 25000 });
    expect(below.success).toBe(false);
    expect(below.error!.issues[0]!.path).toEqual(['expectedSalaryMax']);
  });

  it('numbers only — no text', () => {
    expect(withField({ expectedSalaryMin: 'ตามตกลง' }).success).toBe(false);
    expect(withField({ expectedSalaryMin: -1 }).success).toBe(false);
  });
});

describe('the application form: every line of the address and the emergency contact', () => {
  const address = applicationFormInput().address;

  it.each(Object.keys(address))('address.%s is required', (key) => {
    expect(withField({ address: { ...address, [key]: '' } }).success).toBe(false);
  });

  it('"-" for a line the address does not have; the postal code stays 5 digits', () => {
    expect(withField({ address: { ...address, moo: '-', soi: '-', road: '-' } }).success).toBe(true);
    expect(withField({ address: { ...address, postalCode: '-' } }).success).toBe(false);
  });

  it.each(['name', 'relationship', 'phone'])('emergency.%s is required', (key) => {
    const emergency = { name: 'นางมาลี ศรีสุข', relationship: 'มารดา', phone: '089-765-4321', [key]: '' };
    expect(withField({ emergency }).success).toBe(false);
  });
});

describe('the application form: the name title', () => {
  it('one of นาย / นาง / นางสาว, or none', () => {
    expect(withField({ nameTitle: 'MISS' }).data?.nameTitle).toBe('MISS');
    expect(withField({ nameTitle: null }).data?.nameTitle).toBeNull();
    expect(withField({ nameTitle: 'DR' }).success).toBe(false);
  });
});

describe('the application form: weight and height', () => {
  const sensitive = (weightKg: number) => ({
    sensitiveConsent: true,
    sensitive: { ethnicity: null, religion: null, bloodType: null, weightKg, heightCm: 170.5 },
  });
  it('take one decimal place', () => {
    expect(withField(sensitive(65.5)).data?.sensitive).toMatchObject({ weightKg: 65.5, heightCm: 170.5 });
    expect(withField(sensitive(65.3)).success).toBe(true);
    expect(withField(sensitive(65.55)).success).toBe(false);
  });
});
