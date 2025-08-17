import { beforeAll, afterAll } from 'vitest';

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
  
  console.log('Test environment setup complete');
});

afterAll(async () => {
  // Cleanup test environment
  console.log('Test environment cleanup complete');
});