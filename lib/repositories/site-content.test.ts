import { describe, expect, it } from 'vitest';
import { NotFoundError } from '@/lib/errors';
import { repos } from '@/tests/support/fixtures';

describe('site content overrides', () => {
  it('sets, replaces, reverts, and sets again', async () => {
    await repos.siteContent.set('home.hero.title', 'th', 'ร่วมงานกับเรา', 'hr@shd');
    await repos.siteContent.set('home.hero.title', 'th', 'มาร่วมทีม SHD', 'hr@shd');
    await repos.siteContent.set('home.hero.title', 'en', 'Join SHD', 'hr@shd');
    expect(await repos.siteContent.overrides('th')).toEqual({ 'home.hero.title': 'มาร่วมทีม SHD' });

    await repos.siteContent.revert('home.hero.title', 'th', 'hr@shd');
    expect(await repos.siteContent.overrides('th')).toEqual({});
    expect(await repos.siteContent.overrides('en')).toEqual({ 'home.hero.title': 'Join SHD' });

    // The deleted row does not block a new override of the same key.
    await repos.siteContent.set('home.hero.title', 'th', 'ใหม่', null);
    expect(await repos.siteContent.overrides('th')).toEqual({ 'home.hero.title': 'ใหม่' });
  });

  it('reverting a key with no override is a 404', async () => {
    await expect(repos.siteContent.revert('nope.key', 'th', null)).rejects.toBeInstanceOf(NotFoundError);
  });
});
