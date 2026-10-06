import { afterAll, beforeEach } from 'vitest';
import { resetDatabase, testClient } from './db';

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await testClient.end();
});
