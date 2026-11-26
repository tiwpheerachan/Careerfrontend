import { beforeEach, describe, expect, it, vi } from 'vitest';

const overrides = vi.fn();
const shortened = vi.fn(async () => true);
vi.mock('next/cache', () => ({ unstable_cache: () => shortened }));
vi.mock('@/lib/store', () => ({ store: () => ({ siteContent: { overrides } }) }));

/** react's cache() is per request on the server and a plain call here. */
const { clearPublicMessages, publicMessages } = await import('./public-messages');

const title = async (locale: 'th' | 'en') => {
  const home = (await publicMessages(locale)).nav as Record<string, string>;
  return home.about;
};

describe('the public text', () => {
  beforeEach(() => {
    overrides.mockReset();
    shortened.mockClear();
    clearPublicMessages();
  });

  it('without a database: built-in text, kept for seconds — then the edit, then the edit again', async () => {
    overrides.mockRejectedValue(new Error('down'));
    const builtIn = await title('en');
    expect(builtIn).toBeTruthy();
    expect(shortened).toHaveBeenCalledOnce();

    overrides.mockResolvedValue({ 'nav.about': 'Edited' });
    expect(await title('en')).toBe('Edited');
    expect(shortened).toHaveBeenCalledOnce();

    // Down again: never back to the built-in text.
    clearPublicMessages();
    overrides.mockRejectedValue(new Error('down'));
    expect(await title('en')).toBe('Edited');
    expect(shortened).toHaveBeenCalledTimes(2);
  });

  it('read once while fresh; a save is seen at once, a read begun before it not kept', async () => {
    overrides.mockResolvedValue({ 'nav.about': 'One' });
    await title('th');
    await title('th');
    expect(overrides).toHaveBeenCalledOnce();

    clearPublicMessages();
    let finish!: (value: object) => void;
    overrides.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const before = title('th');
    await vi.waitFor(() => expect(overrides).toHaveBeenCalledTimes(2));
    clearPublicMessages();
    overrides.mockResolvedValue({ 'nav.about': 'Two' });
    expect(await title('th')).toBe('Two');
    finish({ 'nav.about': 'One' });
    await before;
    expect(await title('th')).toBe('Two');
  });
});
