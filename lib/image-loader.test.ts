import { describe, expect, it, vi } from 'vitest';
import imageLoader from './image-loader';

describe('the image loader', () => {
  it('asks for the file the build makes, in production only', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(imageLoader({ src: '/images/a.jpg', width: 640 })).toBe('/_img/images/a.jpg.640.webp');
    vi.stubEnv('NODE_ENV', 'development');
    expect(imageLoader({ src: '/images/a.jpg', width: 640 })).toBe('/images/a.jpg?w=640');
    vi.unstubAllEnvs();
  });
});
