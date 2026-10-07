import { describe, expect, it } from 'vitest';
import { emptyDraft, toInput } from '@/components/application-form/draft';

describe('the wizard draft as the API takes it', () => {
  it('a military answer left from before the sex was changed to female is not sent', () => {
    const draft = { ...emptyDraft(), gender: 'FEMALE' as const, military: 'RESERVIST' as const };
    expect(toInput(draft, 'th').input.military).toBeNull();
    expect(toInput({ ...draft, gender: 'MALE' as const }, 'th').input.military).toBe('RESERVIST');
  });

  it('the name title is sent as chosen, or null', () => {
    expect(toInput({ ...emptyDraft(), nameTitle: 'MISS' }, 'th').input.nameTitle).toBe('MISS');
    expect(toInput(emptyDraft(), 'th').input.nameTitle).toBeNull();
  });
});
