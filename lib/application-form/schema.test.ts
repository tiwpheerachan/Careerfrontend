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

  it('home phone and the emergency phone: optional, but a phone when given', () => {
    expect(withField({ homePhone: '' }).success).toBe(true);
    expect(withField({ homePhone: 'sdfsdf' }).success).toBe(false);
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
