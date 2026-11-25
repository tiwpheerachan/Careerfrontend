import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { pngFits } from './files';

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

describe('pngFits', () => {
  it('takes a photo-sized picture', () => expect(pngFits(png(ihdr(640, 800), idat))).toBe(true));
  it('refuses a huge one', () => expect(pngFits(png(ihdr(8000, 8000), idat))).toBe(false));
  it('refuses a second IHDR, which the decoder would go by', () =>
    expect(pngFits(png(ihdr(10, 10), ihdr(8000, 8000), idat))).toBe(false));
  it('refuses animation frames', () => expect(pngFits(png(ihdr(10, 10), chunk('acTL'), idat))).toBe(false));
  it('refuses one without a header, or cut short', () => {
    expect(pngFits(png(idat))).toBe(false);
    expect(pngFits(png(ihdr(640, 800)).subarray(0, 18))).toBe(false);
  });
});
