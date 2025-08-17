import simpleGit, { SimpleGit, CleanOptions } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import bcrypt from 'bcrypt';
import {
  Repository,
  Credentials,
  Branch,
  Commit,
  PullRequest,
  CloneOptions,
  CommitOptions,
  MergeOptions,
  PushOptions,
  OperationResult,
  MergeResult,
  GitServiceConfig
} from './types.js';
import { CredentialManager } from './auth/credential-manager.js';
import { SecurityManager } from './security/security-manager.js';

export class GitService {
  private config: GitServiceConfig;
  private redis: Redis;
  private credentialManager: CredentialManager;
  private securityManager: SecurityManager;
  private repositories: Map<string, Repository> = new Map();
  private gitInstances: Map<string, SimpleGit> = new Map();

  constructor(config: GitServiceConfig) {
    this.config = config;
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.credentialManager = new CredentialManager(config.encryptionKey, this.redis);
    this.securityManager = new SecurityManager();
    
    // Ensure workspace directory exists
    fs.ensureDirSync(config.workspaceRoot);
  }

  /**
   * Initialize Git service and load existing repositories
   */
  async initialize(): Promise<void> {
    try {
      // Load repositories from Redis
      const repoKeys = await this.redis.keys('git:repo:*');
      for (const key of repoKeys) {
        const repoData = await this.redis.get(key);
        if (repoData) {
          const repository: Repository = JSON.parse(repoData);
          this.repositories.set(repository.id, repository);
          
          // Initialize Git instance if repository exists locally
          if (await fs.pathExists(repository.localPath)) {
            this.gitInstances.set(repository.id, simpleGit(repository.localPath));
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize Git service:', error);
      throw error;
    }
  }

  /**
   * Clone a repository
   */
  async cloneRepository(
    url: string,
    name: string,
    credentials?: Credentials,
    options?: CloneOptions
  ): Promise<Repository> {
    const repositoryId = uuidv4();
    const localPath = path.join(this.config.workspaceRoot, repositoryId);
    
    try {
      // Validate URL
      this.securityManager.validateRepositoryUrl(url);
      
      // Ensure local directory exists
      await fs.ensureDir(localPath);
      
      // Configure Git with credentials
      const git = simpleGit();
      if (credentials) {
        await this.configureGitCredentials(git, credentials, url);
      }
      
      // Clone options
      const cloneOptions: string[] = [];
      if (options?.depth) cloneOptions.push('--depth', options.depth.toString());
      if (options?.branch) cloneOptions.push('--branch', options.branch);
      if (options?.recursive) cloneOptions.push('--recursive');
      if (options?.mirror) cloneOptions.push('--mirror');
      
      // Perform clone
      await git.clone(url, localPath, cloneOptions);
      
      // Initialize Git instance for this repository
      const repoGit = simpleGit(localPath);
      this.gitInstances.set(repositoryId, repoGit);
      
      // Get current branch
      const status = await repoGit.status();
      const currentBranch = status.current || this.config.defaultBranch;
      
      // Get remotes
      const remotes = await repoGit.getRemotes(true);
      
      // Create repository object
      const repository: Repository = {
        id: repositoryId,
        name,
        url,
        localPath,
        branch: currentBranch,
        status: 'active',
        lastSync: new Date(),
        remotes: remotes.map(remote => ({
          name: remote.name,
          url: remote.refs.fetch
        }))
      };
      
      // Store repository
      this.repositories.set(repositoryId, repository);
      await this.saveRepository(repository);
      
      // Store credentials if provided
      if (credentials) {
        await this.credentialManager.storeCredentials(repositoryId, credentials);
      }
      
      return repository;
    } catch (error: any) {
      // Cleanup on failure
      await fs.remove(localPath).catch(() => {});
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Get repository by ID
   */
  async getRepository(repositoryId: string): Promise<Repository | null> {
    return this.repositories.get(repositoryId) || null;
  }

  /**
   * List all repositories
   */
  async listRepositories(): Promise<Repository[]> {
    return Array.from(this.repositories.values());
  }

  /**
   * Create a new branch
   */
  async createBranch(repositoryId: string, branchName: string, startPoint?: string): Promise<Branch> {
    const git = this.getGitInstance(repositoryId);
    
    try {
      // Validate branch name
      this.securityManager.validateBranchName(branchName);
      
      // Create branch
      if (startPoint) {
        await git.checkoutBranch(branchName, startPoint);
      } else {
        await git.checkoutLocalBranch(branchName);
      }
      
      // Get branch info
      const branches = await git.branch();
      const branch = branches.all.find(b => b.includes(branchName));
      
      if (!branch) {
        throw new Error(`Failed to create branch ${branchName}`);
      }
      
      const commit = await git.revparse(['HEAD']);
      
      return {
        name: branchName,
        commit,
        isRemote: false
      };
    } catch (error: any) {
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  /**
   * Switch to a branch
   */
  async checkoutBranch(repositoryId: string, branchName: string): Promise<OperationResult> {
    const git = this.getGitInstance(repositoryId);
    
    try {
      await git.checkout(branchName);
      
      // Update repository record
      const repository = this.repositories.get(repositoryId);
      if (repository) {
        repository.branch = branchName;
        await this.saveRepository(repository);
      }
      
      return {
        success: true,
        message: `Switched to branch ${branchName}`,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to checkout branch: ${error.message}`,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Stage files for commit
   */
  async stageFiles(repositoryId: string, files: string[]): Promise<OperationResult> {
    const git = this.getGitInstance(repositoryId);
    
    try {
      // Validate file paths
      for (const file of files) {
        this.securityManager.validateFilePath(file);
      }
      
      await git.add(files);
      
      return {
        success: true,
        message: `Staged ${files.length} files`,
        details: { files },
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to stage files: ${error.message}`,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Commit changes
   */
  async commit(
    repositoryId: string,
    message: string,
    options?: CommitOptions
  ): Promise<OperationResult> {
    const git = this.getGitInstance(repositoryId);
    
    try {
      // Validate commit message
      this.securityManager.validateCommitMessage(message);
      
      // Configure author if provided
      if (options?.author) {
        await git.addConfig('user.name', options.author.name);
        await git.addConfig('user.email', options.author.email);
      }
      
      // Commit options
      const commitOptions: string[] = [];
      if (options?.allowEmpty) commitOptions.push('--allow-empty');
      if (options?.amend) commitOptions.push('--amend');
      
      const result = await git.commit(message, undefined, commitOptions);
      
      return {
        success: true,
        message: `Committed changes: ${result.commit}`,
        details: { commit: result.commit, summary: result.summary },
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to commit: ${error.message}`,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Push changes to remote
   */
  async push(
    repositoryId: string,
    remote: string = 'origin',
    branch?: string,
    options?: PushOptions
  ): Promise<OperationResult> {
    const git = this.getGitInstance(repositoryId);
    
    try {
      // Load credentials for authentication
      const credentials = await this.credentialManager.getCredentials(repositoryId);
      if (credentials) {
        const repository = this.repositories.get(repositoryId)!;
        await this.configureGitCredentials(git, credentials, repository.url);
      }
      
      // Push options
      const pushOptions: string[] = [];
      if (options?.force) pushOptions.push('--force');
      if (options?.tags) pushOptions.push('--tags');
      if (options?.upstream) pushOptions.push('--set-upstream');
      
      const result = await git.push(remote, branch, pushOptions);
      
      return {
        success: true,
        message: `Pushed to ${remote}/${branch || 'current branch'}`,
        details: result,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to push: ${error.message}`,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Pull changes from remote
   */
  async pull(repositoryId: string, remote: string = 'origin', branch?: string): Promise<OperationResult> {
    const git = this.getGitInstance(repositoryId);
    
    try {
      // Load credentials for authentication
      const credentials = await this.credentialManager.getCredentials(repositoryId);
      if (credentials) {
        const repository = this.repositories.get(repositoryId)!;
        await this.configureGitCredentials(git, credentials, repository.url);
      }
      
      const result = await git.pull(remote, branch);
      
      // Update last sync time
      const repository = this.repositories.get(repositoryId);
      if (repository) {
        repository.lastSync = new Date();
        await this.saveRepository(repository);
      }
      
      return {
        success: true,
        message: `Pulled from ${remote}/${branch || 'current branch'}`,
        details: result,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to pull: ${error.message}`,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get commit history
   */
  async getCommitHistory(
    repositoryId: string,
    options?: { maxCount?: number; since?: Date; until?: Date; author?: string }
  ): Promise<Commit[]> {
    const git = this.getGitInstance(repositoryId);
    
    try {
      const logOptions: any = {};
      if (options?.maxCount) logOptions.maxCount = options.maxCount;
      if (options?.since) logOptions.from = options.since.toISOString();
      if (options?.until) logOptions.to = options.until.toISOString();
      if (options?.author) logOptions.author = options.author;
      
      const log = await git.log(logOptions);
      
      return log.all.map(commit => ({
        hash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        message: commit.message,
        author: {
          name: commit.author_name,
          email: commit.author_email,
          date: new Date(commit.date)
        },
        committer: {
          name: commit.author_name,
          email: commit.author_email,
          date: new Date(commit.date)
        },
        parents: commit.refs ? commit.refs.split(', ') : []
      }));
    } catch (error: any) {
      throw new Error(`Failed to get commit history: ${error.message}`);
    }
  }

  /**
   * Get Git instance for repository
   */
  private getGitInstance(repositoryId: string): SimpleGit {
    const git = this.gitInstances.get(repositoryId);
    if (!git) {
      throw new Error(`Repository ${repositoryId} not found or not initialized`);
    }
    return git;
  }

  /**
   * Configure Git with credentials
   */
  private async configureGitCredentials(git: SimpleGit, credentials: Credentials, url: string): Promise<void> {
    switch (credentials.type) {
      case 'https':
        // Configure credential helper for HTTPS
        const credentialUrl = new URL(url);
        credentialUrl.username = credentials.username;
        credentialUrl.password = credentials.password;
        break;
        
      case 'token':
        // Configure token authentication
        await git.addConfig('credential.helper', 'store');
        break;
        
      case 'ssh':
        // SSH key configuration would be handled at the system level
        // This is typically done by configuring SSH agent or SSH config
        break;
        
      case 'oauth':
        // OAuth token configuration
        await git.addConfig('credential.helper', 'store');
        break;
    }
  }

  /**
   * Save repository to Redis
   */
  private async saveRepository(repository: Repository): Promise<void> {
    await this.redis.set(
      `git:repo:${repository.id}`,
      JSON.stringify(repository),
      'EX',
      86400 // 24 hours
    );
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.redis.quit();
  }
}