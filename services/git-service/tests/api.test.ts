import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fastify from '../src/index.js';

// Mock Redis and Git operations for API testing
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      keys: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      quit: vi.fn().mockResolvedValue('OK')
    }))
  };
});

vi.mock('simple-git', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      clone: vi.fn().mockResolvedValue({}),
      status: vi.fn().mockResolvedValue({ current: 'main' }),
      getRemotes: vi.fn().mockResolvedValue([{ name: 'origin', refs: { fetch: 'https://github.com/test/repo.git' } }]),
      checkoutBranch: vi.fn().mockResolvedValue({}),
      checkoutLocalBranch: vi.fn().mockResolvedValue({}),
      checkout: vi.fn().mockResolvedValue({}),
      branch: vi.fn().mockResolvedValue({ all: ['test-branch'] }),
      revparse: vi.fn().mockResolvedValue('abc123'),
      add: vi.fn().mockResolvedValue({}),
      commit: vi.fn().mockResolvedValue({ commit: 'abc123', summary: { changes: 1 } }),
      push: vi.fn().mockResolvedValue({}),
      pull: vi.fn().mockResolvedValue({}),
      log: vi.fn().mockResolvedValue({ 
        all: [{
          hash: 'abc123',
          message: 'Test commit',
          author_name: 'Test Author',
          author_email: 'test@example.com',
          date: '2024-01-01T00:00:00Z',
          refs: ''
        }]
      }),
      addConfig: vi.fn().mockResolvedValue({})
    }))
  };
});

describe('Git Service API', () => {
  beforeAll(async () => {
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Repository Management', () => {
    it('should clone a repository', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/repositories/clone',
        payload: {
          url: 'https://github.com/test/repo.git',
          name: 'test-repo'
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.repository).toBeDefined();
      expect(body.repository.name).toBe('test-repo');
    });

    it('should reject clone request without URL', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/repositories/clone',
        payload: {
          name: 'test-repo'
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('URL and name are required');
    });

    it('should list repositories', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/repositories'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.repositories)).toBe(true);
    });
  });

  describe('Branch Operations', () => {
    let repositoryId: string;

    beforeAll(async () => {
      // Clone a repository first
      const cloneResponse = await fastify.inject({
        method: 'POST',
        url: '/repositories/clone',
        payload: {
          url: 'https://github.com/test/repo.git',
          name: 'test-repo-branches'
        }
      });
      
      const cloneBody = JSON.parse(cloneResponse.body);
      repositoryId = cloneBody.repository.id;
    });

    it('should create a branch', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/repositories/${repositoryId}/branches`,
        payload: {
          branchName: 'feature/test-branch'
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.branch).toBeDefined();
      expect(body.branch.name).toBe('feature/test-branch');
    });

    it('should reject branch creation without name', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/repositories/${repositoryId}/branches`,
        payload: {}
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Branch name is required');
    });

    it('should checkout a branch', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/repositories/${repositoryId}/checkout`,
        payload: {
          branchName: 'main'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('File Operations', () => {
    let repositoryId: string;

    beforeAll(async () => {
      // Clone a repository first
      const cloneResponse = await fastify.inject({
        method: 'POST',
        url: '/repositories/clone',
        payload: {
          url: 'https://github.com/test/repo.git',
          name: 'test-repo-files'
        }
      });
      
      const cloneBody = JSON.parse(cloneResponse.body);
      repositoryId = cloneBody.repository.id;
    });

    it('should stage files', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/repositories/${repositoryId}/stage`,
        payload: {
          files: ['file1.txt', 'file2.txt']
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should reject staging without files array', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/repositories/${repositoryId}/stage`,
        payload: {}
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Files array is required');
    });

    it('should commit changes', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/repositories/${repositoryId}/commit`,
        payload: {
          message: 'Test commit message'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should reject commit without message', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/repositories/${repositoryId}/commit`,
        payload: {}
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Commit message is required');
    });
  });

  describe('Remote Operations', () => {
    let repositoryId: string;

    beforeAll(async () => {
      // Clone a repository first
      const cloneResponse = await fastify.inject({
        method: 'POST',
        url: '/repositories/clone',
        payload: {
          url: 'https://github.com/test/repo.git',
          name: 'test-repo-remote'
        }
      });
      
      const cloneBody = JSON.parse(cloneResponse.body);
      repositoryId = cloneBody.repository.id;
    });

    it('should push changes', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/repositories/${repositoryId}/push`,
        payload: {}
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should pull changes', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/repositories/${repositoryId}/pull`,
        payload: {}
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('History Operations', () => {
    let repositoryId: string;

    beforeAll(async () => {
      // Clone a repository first
      const cloneResponse = await fastify.inject({
        method: 'POST',
        url: '/repositories/clone',
        payload: {
          url: 'https://github.com/test/repo.git',
          name: 'test-repo-history'
        }
      });
      
      const cloneBody = JSON.parse(cloneResponse.body);
      repositoryId = cloneBody.repository.id;
    });

    it('should get commit history', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/repositories/${repositoryId}/history`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.commits)).toBe(true);
    });

    it('should get commit history with query parameters', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/repositories/${repositoryId}/history?maxCount=5&author=Test%20Author`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.commits)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository not found', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/repositories/non-existent-id'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Repository not found');
    });

    it('should handle invalid repository ID in branch operations', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/repositories/invalid-id/branches',
        payload: {
          branchName: 'test-branch'
        }
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('Pull Request Operations', () => {
    let repositoryId: string;

    beforeAll(async () => {
      // Clone a repository first
      const cloneResponse = await fastify.inject({
        method: 'POST',
        url: '/repositories/clone',
        payload: {
          url: 'https://github.com/test/repo.git',
          name: 'test-repo-pr'
        }
      });
      
      const cloneBody = JSON.parse(cloneResponse.body);
      repositoryId = cloneBody.repository.id;
    });

    it('should reject PR creation without required fields', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/repositories/${repositoryId}/pull-requests`,
        payload: {
          title: 'Test PR'
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Title, head, base, and credentials are required');
    });
  });
});