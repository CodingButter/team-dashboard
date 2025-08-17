import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitService } from '../src/git-service.js';
import { SecurityManager } from '../src/security/security-manager.js';
import { CredentialManager } from '../src/auth/credential-manager.js';
import { GitServiceConfig, Credentials } from '../src/types.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Mock Redis
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

// Mock simple-git
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

describe('GitService', () => {
  let gitService: GitService;
  let config: GitServiceConfig;
  let testWorkspace: string;

  beforeEach(async () => {
    testWorkspace = path.join(os.tmpdir(), 'git-service-test', Date.now().toString());
    await fs.ensureDir(testWorkspace);

    config = {
      workspaceRoot: testWorkspace,
      maxRepositories: 10,
      defaultBranch: 'main',
      encryptionKey: 'test-encryption-key-32-chars-long',
      redis: {
        host: 'localhost',
        port: 6379
      }
    };

    gitService = new GitService(config);
    await gitService.initialize();
  });

  afterEach(async () => {
    await gitService.cleanup();
    await fs.remove(testWorkspace);
  });

  describe('Repository Management', () => {
    it('should clone a repository successfully', async () => {
      const url = 'https://github.com/test/repo.git';
      const name = 'test-repo';
      
      const repository = await gitService.cloneRepository(url, name);
      
      expect(repository).toBeDefined();
      expect(repository.name).toBe(name);
      expect(repository.url).toBe(url);
      expect(repository.status).toBe('active');
      expect(repository.branch).toBe('main');
    });

    it('should reject invalid repository URLs', async () => {
      const invalidUrl = 'javascript:alert("xss")';
      const name = 'test-repo';
      
      await expect(gitService.cloneRepository(invalidUrl, name)).rejects.toThrow();
    });

    it('should list repositories', async () => {
      const repositories = await gitService.listRepositories();
      expect(Array.isArray(repositories)).toBe(true);
    });

    it('should get repository by ID', async () => {
      const url = 'https://github.com/test/repo.git';
      const name = 'test-repo';
      
      const repository = await gitService.cloneRepository(url, name);
      const retrieved = await gitService.getRepository(repository.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(repository.id);
    });
  });

  describe('Branch Operations', () => {
    let repositoryId: string;

    beforeEach(async () => {
      const repository = await gitService.cloneRepository('https://github.com/test/repo.git', 'test-repo');
      repositoryId = repository.id;
    });

    it('should create a new branch', async () => {
      const branchName = 'feature/test-branch';
      
      const branch = await gitService.createBranch(repositoryId, branchName);
      
      expect(branch).toBeDefined();
      expect(branch.name).toBe(branchName);
      expect(branch.isRemote).toBe(false);
    });

    it('should reject invalid branch names', async () => {
      const invalidBranchName = '../invalid-branch';
      
      await expect(gitService.createBranch(repositoryId, invalidBranchName)).rejects.toThrow();
    });

    it('should checkout a branch', async () => {
      const branchName = 'main';
      
      const result = await gitService.checkoutBranch(repositoryId, branchName);
      
      expect(result.success).toBe(true);
    });
  });

  describe('Commit Operations', () => {
    let repositoryId: string;

    beforeEach(async () => {
      const repository = await gitService.cloneRepository('https://github.com/test/repo.git', 'test-repo');
      repositoryId = repository.id;
    });

    it('should stage files', async () => {
      const files = ['file1.txt', 'file2.txt'];
      
      const result = await gitService.stageFiles(repositoryId, files);
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid file paths', async () => {
      const invalidFiles = ['../../../etc/passwd'];
      
      await expect(gitService.stageFiles(repositoryId, invalidFiles)).rejects.toThrow();
    });

    it('should commit changes', async () => {
      const message = 'Test commit message';
      
      const result = await gitService.commit(repositoryId, message);
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid commit messages', async () => {
      const invalidMessage = '`rm -rf /`';
      
      await expect(gitService.commit(repositoryId, invalidMessage)).rejects.toThrow();
    });
  });

  describe('Remote Operations', () => {
    let repositoryId: string;

    beforeEach(async () => {
      const repository = await gitService.cloneRepository('https://github.com/test/repo.git', 'test-repo');
      repositoryId = repository.id;
    });

    it('should push changes', async () => {
      const result = await gitService.push(repositoryId);
      
      expect(result.success).toBe(true);
    });

    it('should pull changes', async () => {
      const result = await gitService.pull(repositoryId);
      
      expect(result.success).toBe(true);
    });
  });

  describe('History Operations', () => {
    let repositoryId: string;

    beforeEach(async () => {
      const repository = await gitService.cloneRepository('https://github.com/test/repo.git', 'test-repo');
      repositoryId = repository.id;
    });

    it('should get commit history', async () => {
      const commits = await gitService.getCommitHistory(repositoryId);
      
      expect(Array.isArray(commits)).toBe(true);
      if (commits.length > 0) {
        expect(commits[0]).toHaveProperty('hash');
        expect(commits[0]).toHaveProperty('message');
        expect(commits[0]).toHaveProperty('author');
      }
    });

    it('should get commit history with options', async () => {
      const options = {
        maxCount: 5,
        author: 'Test Author'
      };
      
      const commits = await gitService.getCommitHistory(repositoryId, options);
      
      expect(Array.isArray(commits)).toBe(true);
    });
  });
});

describe('SecurityManager', () => {
  let securityManager: SecurityManager;

  beforeEach(() => {
    securityManager = new SecurityManager();
  });

  describe('URL Validation', () => {
    it('should validate correct GitHub URLs', () => {
      const validUrls = [
        'https://github.com/user/repo.git',
        'git@github.com:user/repo.git',
        'https://github.com/user/repo'
      ];

      validUrls.forEach(url => {
        expect(() => securityManager.validateRepositoryUrl(url)).not.toThrow();
      });
    });

    it('should reject malicious URLs', () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd',
        'ftp://malicious.com/backdoor'
      ];

      maliciousUrls.forEach(url => {
        expect(() => securityManager.validateRepositoryUrl(url)).toThrow();
      });
    });

    it('should reject URLs with path traversal', () => {
      const traversalUrls = [
        'https://github.com/../../../etc/passwd',
        'https://github.com/user/repo/../../../sensitive'
      ];

      traversalUrls.forEach(url => {
        expect(() => securityManager.validateRepositoryUrl(url)).toThrow();
      });
    });
  });

  describe('Branch Name Validation', () => {
    it('should validate correct branch names', () => {
      const validNames = [
        'main',
        'feature/new-feature',
        'bugfix/fix-123',
        'release/v1.0.0'
      ];

      validNames.forEach(name => {
        expect(() => securityManager.validateBranchName(name)).not.toThrow();
      });
    });

    it('should reject invalid branch names', () => {
      const invalidNames = [
        '',
        '-invalid',
        'branch..name',
        'branch with spaces',
        'branch~name',
        'branch?name',
        'branch*name',
        '.hidden',
        'branch.',
        'branch/',
        'branch//',
        '@invalid'
      ];

      invalidNames.forEach(name => {
        expect(() => securityManager.validateBranchName(name)).toThrow();
      });
    });
  });

  describe('File Path Validation', () => {
    it('should validate safe file paths', () => {
      const validPaths = [
        'file.txt',
        'folder/file.txt',
        'src/components/Button.tsx'
      ];

      validPaths.forEach(path => {
        expect(() => securityManager.validateFilePath(path)).not.toThrow();
      });
    });

    it('should reject dangerous file paths', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '/absolute/path',
        'file\\with\\backslashes',
        'file:with:colons',
        'file<with>brackets',
        'file"with"quotes',
        'file|with|pipes',
        'file?with?questions',
        'file*with*asterisks'
      ];

      dangerousPaths.forEach(path => {
        expect(() => securityManager.validateFilePath(path)).toThrow();
      });
    });
  });

  describe('Commit Message Validation', () => {
    it('should validate safe commit messages', () => {
      const validMessages = [
        'Add new feature',
        'Fix bug in user authentication',
        'Update documentation with examples'
      ];

      validMessages.forEach(message => {
        expect(() => securityManager.validateCommitMessage(message)).not.toThrow();
      });
    });

    it('should reject dangerous commit messages', () => {
      const dangerousMessages = [
        '',
        '   ',
        '`rm -rf /`',
        '$(malicious command)',
        '${injection}',
        '<!-- HTML comment -->',
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'data:text/html,malicious'
      ];

      dangerousMessages.forEach(message => {
        expect(() => securityManager.validateCommitMessage(message)).toThrow();
      });
    });
  });
});

describe('CredentialManager', () => {
  let credentialManager: CredentialManager;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(1)
    };
    
    credentialManager = new CredentialManager('test-encryption-key-32-chars-long', mockRedis);
  });

  describe('Credential Storage', () => {
    it('should store and retrieve HTTPS credentials', async () => {
      const credentials: Credentials = {
        type: 'https',
        username: 'testuser',
        password: 'testpass'
      };

      await credentialManager.storeCredentials('repo-1', credentials);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should store and retrieve SSH credentials', async () => {
      const credentials: Credentials = {
        type: 'ssh',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        publicKey: 'ssh-rsa AAAAB3NzaC1yc2E test@example.com'
      };

      await credentialManager.storeCredentials('repo-1', credentials);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should store and retrieve token credentials', async () => {
      const credentials: Credentials = {
        type: 'token',
        token: 'ghp_test_token_1234567890',
        provider: 'github'
      };

      await credentialManager.storeCredentials('repo-1', credentials);
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('Credential Validation', () => {
    it('should validate HTTPS credentials', async () => {
      const credentials = {
        type: 'https',
        username: 'testuser',
        password: 'testpass'
      };

      const isValid = await credentialManager.validateCredentials(credentials as Credentials);
      expect(isValid).toBe(true);
    });

    it('should validate SSH credentials', async () => {
      const credentials = {
        type: 'ssh',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        publicKey: 'ssh-rsa AAAAB3NzaC1yc2E test@example.com'
      };

      const isValid = await credentialManager.validateCredentials(credentials as Credentials);
      expect(isValid).toBe(true);
    });

    it('should validate GitHub token credentials', async () => {
      const credentials = {
        type: 'token',
        token: 'ghp_test_token_1234567890',
        provider: 'github'
      };

      const isValid = await credentialManager.validateCredentials(credentials as Credentials);
      expect(isValid).toBe(true);
    });

    it('should reject invalid token credentials', async () => {
      const credentials = {
        type: 'token',
        token: 'invalid_token',
        provider: 'github'
      };

      const isValid = await credentialManager.validateCredentials(credentials as Credentials);
      expect(isValid).toBe(false);
    });
  });
});