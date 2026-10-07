import { describe, expect, it } from 'vitest';
import { splitSaraAm, wrapToWidth } from './thai';

/** Every character 1 unit wide. */
const width = (s: string) => [...s].length;

describe('wrapToWidth', () => {
  it('breaks Thai between words, never inside one, with no hyphen', () => {
    const lines = wrapToWidth('ผู้สมัครมีประสบการณ์ตรงสายงาน', 12, width).split('\n');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe('ผู้สมัครมีประสบการณ์ตรงสายงาน');
    expect(lines.every((l) => width(l) <= 12)).toBe(true);
    expect(lines.join('')).not.toContain('-');
  });

  it('keeps short text and existing line breaks', () => {
    expect(wrapToWidth('สั้น', 50, width)).toBe('สั้น');
    expect(wrapToWidth('a\nb', 50, width)).toBe('a\nb');
  });

  it('breaks a word longer than the line between characters', () => {
    expect(wrapToWidth('abcdefghij', 4, width)).toBe('abcd\nefgh\nij');
  });

  it('wraps English at spaces', () => {
    expect(wrapToWidth('the quick brown fox', 10, width)).toBe('the quick\nbrown fox');
  });
});

describe('splitSaraAm still', () => {
  it('splits ำ', () => expect(splitSaraAm('น้ำ')).toBe('นํ้า'));
});
