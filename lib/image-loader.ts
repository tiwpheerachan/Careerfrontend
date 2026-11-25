/**
 * next/image's loader: the files scripts/build-images.mjs made, so no request
 * ever resizes a picture (that was what filled the 512 MB instance).
 * In development the original is served: there is nothing to build first.
 */
export default function imageLoader({ src, width }: { src: string; width: number }): string {
  return process.env.NODE_ENV === 'production' ? `/_img${src}.${width}.webp` : `${src}?w=${width}`;
}
