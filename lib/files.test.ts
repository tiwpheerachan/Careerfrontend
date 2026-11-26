import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { safePng } from './files';

const chunk = (type: string, data: Buffer = Buffer.alloc(0)) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length);
  head.write(type, 4, 'latin1');
  return Buffer.concat([head, data, Buffer.alloc(4)]);
};
const ihdr = (width: number, height: number) => {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width);
  data.writeUInt32BE(height, 4);
  return chunk('IHDR', data);
};
const png = (...chunks: Buffer[]) =>
  new Uint8Array(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]), ...chunks, chunk('IEND')]));
const idat = chunk('IDAT', deflateSync(Buffer.alloc(10)));
/** A chunk that claims to be longer than the file. */
const lying = (type: string) => {
  const c = chunk(type, Buffer.from('a'));
  c.writeUInt32BE(1_000_000_000);
  return c;
};

describe('safePng', () => {
  it('keeps the picture and drops what is not part of it', () => {
    const plain = png(ihdr(640, 800), idat);
    expect(safePng(plain)).toEqual(plain);
    expect(safePng(png(ihdr(640, 800), chunk('tEXt', Buffer.from('no zero byte')), chunk('iTXt'), idat))).toEqual(
      plain,
    );
    expect(safePng(png(ihdr(640, 800), chunk('acTL'), chunk('fdAT'), idat))).toEqual(plain);
  });
  it('refuses a huge one, or an empty one', () => {
    expect(safePng(png(ihdr(8000, 8000), idat))).toBeNull();
    expect(safePng(png(ihdr(0, 800), idat))).toBeNull();
  });
  it('refuses a second header, which the decoder would go by', () =>
    expect(safePng(png(ihdr(10, 10), ihdr(8000, 8000), idat))).toBeNull());
  it('refuses a chunk longer than the file — 48 bytes of this ended the process', () => {
    for (const type of ['tEXt', 'iTXt', 'PLTE', 'IDAT', 'xxxx']) {
      expect(safePng(png(ihdr(1, 1), lying(type)))).toBeNull();
    }
  });
  it('refuses pixels that do not unpack, or unpack to far more than a photo', () => {
    expect(safePng(png(ihdr(10, 10), chunk('IDAT', Buffer.from('junk'))))).toBeNull();
    expect(safePng(png(ihdr(10, 10), chunk('IDAT', deflateSync(Buffer.alloc(40_000_000)))))).toBeNull();
  });
  it('refuses one without a header, pixels or an end, or cut short', () => {
    expect(safePng(png(idat))).toBeNull();
    expect(safePng(png(ihdr(640, 800)))).toBeNull();
    const whole = png(ihdr(640, 800), idat);
    for (let n = 0; n < whole.length; n++) expect(safePng(whole.subarray(0, n))).toBeNull();
  });
});
