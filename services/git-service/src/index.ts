import Fastify from 'fastify';
import { GitService } from './git-service.js';
import { GitHubProvider } from './providers/github-provider.js';
import { GitServiceConfig } from './types.js';
import path from 'path';
import os from 'os';

// Load configuration
const config: GitServiceConfig = {
  workspaceRoot: process.env.GIT_WORKSPACE_ROOT || path.join(os.tmpdir(), 'git-workspace'),
  maxRepositories: parseInt(process.env.MAX_REPOSITORIES || '100'),
  defaultBranch: process.env.DEFAULT_BRANCH || 'main',
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-key-change-in-production',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET
  }
};

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
});

// Initialize Git service
const gitService = new GitService(config);

// CORS support
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Initialize service
fastify.addHook('onReady', async () => {
  await gitService.initialize();
});

// Routes
fastify.register(async function (fastify) {
  
  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // Clone repository
  fastify.post<{
    Body: {
      url: string;
      name: string;
      credentials?: any;
      options?: any;
    }
  }>('/repositories/clone', async (request, reply) => {
    try {
      const { url, name, credentials, options } = request.body;
      
      if (!url || !name) {
        return reply.code(400).send({ error: 'URL and name are required' });
      }

      const repository = await gitService.cloneRepository(url, name, credentials, options);
      
      return reply.code(201).send({
        success: true,
        repository,
        message: 'Repository cloned successfully'
      });
    } catch (error: any) {
      fastify.log.error('Error cloning repository:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to clone repository',
        details: error.message
      });
    }
  });

  // List repositories
  fastify.get('/repositories', async () => {
    try {
      const repositories = await gitService.listRepositories();
      return {
        success: true,
        repositories,
        count: repositories.length
      };
    } catch (error: any) {
      throw new Error(`Failed to list repositories: ${error.message}`);
    }
  });

  // Get repository
  fastify.get<{ Params: { id: string } }>('/repositories/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const repository = await gitService.getRepository(id);
      
      if (!repository) {
        return reply.code(404).send({ error: 'Repository not found' });
      }

      return {
        success: true,
        repository
      };
    } catch (error: any) {
      throw new Error(`Failed to get repository: ${error.message}`);
    }
  });

  // Create branch
  fastify.post<{
    Params: { id: string };
    Body: { branchName: string; startPoint?: string }
  }>('/repositories/:id/branches', async (request, reply) => {
    try {
      const { id } = request.params;
      const { branchName, startPoint } = request.body;
      
      if (!branchName) {
        return reply.code(400).send({ error: 'Branch name is required' });
      }

      const branch = await gitService.createBranch(id, branchName, startPoint);
      
      return reply.code(201).send({
        success: true,
        branch,
        message: 'Branch created successfully'
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to create branch',
        details: error.message
      });
    }
  });

  // Checkout branch
  fastify.post<{
    Params: { id: string };
    Body: { branchName: string }
  }>('/repositories/:id/checkout', async (request, reply) => {
    try {
      const { id } = request.params;
      const { branchName } = request.body;
      
      if (!branchName) {
        return reply.code(400).send({ error: 'Branch name is required' });
      }

      const result = await gitService.checkoutBranch(id, branchName);
      
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to checkout branch',
        details: error.message
      });
    }
  });

  // Stage files
  fastify.post<{
    Params: { id: string };
    Body: { files: string[] }
  }>('/repositories/:id/stage', async (request, reply) => {
    try {
      const { id } = request.params;
      const { files } = request.body;
      
      if (!files || !Array.isArray(files)) {
        return reply.code(400).send({ error: 'Files array is required' });
      }

      const result = await gitService.stageFiles(id, files);
      
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to stage files',
        details: error.message
      });
    }
  });

  // Commit changes
  fastify.post<{
    Params: { id: string };
    Body: { message: string; options?: any }
  }>('/repositories/:id/commit', async (request, reply) => {
    try {
      const { id } = request.params;
      const { message, options } = request.body;
      
      if (!message) {
        return reply.code(400).send({ error: 'Commit message is required' });
      }

      const result = await gitService.commit(id, message, options);
      
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to commit',
        details: error.message
      });
    }
  });

  // Push changes
  fastify.post<{
    Params: { id: string };
    Body: { remote?: string; branch?: string; options?: any }
  }>('/repositories/:id/push', async (request, reply) => {
    try {
      const { id } = request.params;
      const { remote, branch, options } = request.body;

      const result = await gitService.push(id, remote, branch, options);
      
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to push',
        details: error.message
      });
    }
  });

  // Pull changes
  fastify.post<{
    Params: { id: string };
    Body: { remote?: string; branch?: string }
  }>('/repositories/:id/pull', async (request, reply) => {
    try {
      const { id } = request.params;
      const { remote, branch } = request.body;

      const result = await gitService.pull(id, remote, branch);
      
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to pull',
        details: error.message
      });
    }
  });

  // Get commit history
  fastify.get<{
    Params: { id: string };
    Querystring: { maxCount?: string; since?: string; until?: string; author?: string }
  }>('/repositories/:id/history', async (request, reply) => {
    try {
      const { id } = request.params;
      const { maxCount, since, until, author } = request.query;
      
      const options: any = {};
      if (maxCount) options.maxCount = parseInt(maxCount);
      if (since) options.since = new Date(since);
      if (until) options.until = new Date(until);
      if (author) options.author = author;

      const commits = await gitService.getCommitHistory(id, options);
      
      return {
        success: true,
        commits,
        count: commits.length
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to get commit history',
        details: error.message
      });
    }
  });

  // GitHub Pull Request operations
  fastify.post<{
    Params: { id: string };
    Body: {
      title: string;
      body: string;
      head: string;
      base: string;
      credentials: any;
    }
  }>('/repositories/:id/pull-requests', async (request, reply) => {
    try {
      const { id } = request.params;
      const { title, body, head, base, credentials } = request.body;
      
      if (!title || !head || !base || !credentials) {
        return reply.code(400).send({ 
          error: 'Title, head, base, and credentials are required' 
        });
      }

      const repository = await gitService.getRepository(id);
      if (!repository) {
        return reply.code(404).send({ error: 'Repository not found' });
      }

      const githubProvider = new GitHubProvider(credentials);
      const pullRequest = await githubProvider.createPullRequest(
        repository.url,
        title,
        body,
        head,
        base
      );
      
      return reply.code(201).send({
        success: true,
        pullRequest,
        message: 'Pull request created successfully'
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to create pull request',
        details: error.message
      });
    }
  });

  // Get pull requests
  fastify.get<{
    Params: { id: string };
    Querystring: { state?: 'open' | 'closed' | 'all' }
  }>('/repositories/:id/pull-requests', async (request, reply) => {
    try {
      const { id } = request.params;
      const { state = 'open' } = request.query;
      
      const repository = await gitService.getRepository(id);
      if (!repository) {
        return reply.code(404).send({ error: 'Repository not found' });
      }

      // Note: This requires stored credentials for the repository
      // In a real implementation, you'd retrieve these from the credential manager
      const credentials = { type: 'token', token: 'placeholder', provider: 'github' } as any;
      
      const githubProvider = new GitHubProvider(credentials);
      const pullRequests = await githubProvider.listPullRequests(repository.url, state);
      
      return {
        success: true,
        pullRequests,
        count: pullRequests.length
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to get pull requests',
        details: error.message
      });
    }
  });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3006');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 Git Service running on http://${host}:${port}`);
    console.log('Available endpoints:');
    console.log('  GET    /health');
    console.log('  POST   /repositories/clone');
    console.log('  GET    /repositories');
    console.log('  GET    /repositories/:id');
    console.log('  POST   /repositories/:id/branches');
    console.log('  POST   /repositories/:id/checkout');
    console.log('  POST   /repositories/:id/stage');
    console.log('  POST   /repositories/:id/commit');
    console.log('  POST   /repositories/:id/push');
    console.log('  POST   /repositories/:id/pull');
    console.log('  GET    /repositories/:id/history');
    console.log('  POST   /repositories/:id/pull-requests');
    console.log('  GET    /repositories/:id/pull-requests');
    
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('Shutting down Git service...');
  await gitService.cleanup();
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Git service...');
  await gitService.cleanup();
  await fastify.close();
  process.exit(0);
});

if (require.main === module) {
  start();
}

export default fastify;