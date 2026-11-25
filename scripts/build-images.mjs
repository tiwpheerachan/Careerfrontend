#!/usr/bin/env node
/**
 * Every picture in public/, in every width next/image may ask for, as WebP:
 *
 *   public/images/a.jpg → public/_img/images/a.jpg.640.webp, …
 *
 * Part of `npm run build`; public/_img is gitignored. Any failure fails the
 * build: a missing variant is a broken picture on the site.
 */
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { DEVICE_SIZES, IMAGE_SIZES } from '../lib/image-widths.ts';

const OUT = path.join('public', '_img');
sharp.cache(false);

// Generated output only: a picture that was removed must not keep its old variants.
await rm(OUT, { recursive: true, force: true });

const sources = (await readdir('public', { recursive: true })).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
if (sources.length === 0) throw new Error('No pictures in public/ — run from the project root.');

let files = 0;
for (const source of sources) {
  const target = path.join(OUT, source);
  await mkdir(path.dirname(target), { recursive: true });
  for (const width of [...IMAGE_SIZES, ...DEVICE_SIZES]) {
    await sharp(path.join('public', source))
      .rotate()
      .resize(width, undefined, { withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(`${target}.${width}.webp`);
    files++;
  }
}
console.log(`✓ ${files} pictures from ${sources.length} originals in ${OUT}`);
