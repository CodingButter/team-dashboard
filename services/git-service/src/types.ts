import { z } from 'zod';

// Repository Types
export const RepositorySchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  localPath: z.string(),
  branch: z.string(),
  status: z.enum(['active', 'cloning', 'error', 'archived']),
  lastSync: z.date(),
  remotes: z.array(z.object({
    name: z.string(),
    url: z.string()
  })),
  metadata: z.record(z.any()).optional()
});

export type Repository = z.infer<typeof RepositorySchema>;

// Authentication Types
export const CredentialTypeSchema = z.enum(['ssh', 'https', 'oauth', 'token']);

export const SSHCredentialsSchema = z.object({
  type: z.literal('ssh'),
  privateKey: z.string(),
  publicKey: z.string(),
  passphrase: z.string().optional()
});

export const HTTPSCredentialsSchema = z.object({
  type: z.literal('https'),
  username: z.string(),
  password: z.string()
});

export const TokenCredentialsSchema = z.object({
  type: z.literal('token'),
  token: z.string(),
  provider: z.enum(['github', 'gitlab', 'bitbucket'])
});

export const OAuthCredentialsSchema = z.object({
  type: z.literal('oauth'),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  provider: z.enum(['github', 'gitlab', 'bitbucket'])
});

export const CredentialsSchema = z.discriminatedUnion('type', [
  SSHCredentialsSchema,
  HTTPSCredentialsSchema,
  TokenCredentialsSchema,
  OAuthCredentialsSchema
]);

export type Credentials = z.infer<typeof CredentialsSchema>;

// Branch Types
export const BranchSchema = z.object({
  name: z.string(),
  commit: z.string(),
  isRemote: z.boolean(),
  remote: z.string().optional(),
  upstream: z.string().optional()
});

export type Branch = z.infer<typeof BranchSchema>;

// Commit Types
export const CommitSchema = z.object({
  hash: z.string(),
  shortHash: z.string(),
  message: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string(),
    date: z.date()
  }),
  committer: z.object({
    name: z.string(),
    email: z.string(),
    date: z.date()
  }),
  parents: z.array(z.string()),
  files: z.array(z.object({
    path: z.string(),
    status: z.enum(['added', 'modified', 'deleted', 'renamed', 'copied']),
    additions: z.number(),
    deletions: z.number()
  })).optional()
});

export type Commit = z.infer<typeof CommitSchema>;

// Pull Request Types
export const PullRequestSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  source: z.string(),
  target: z.string(),
  status: z.enum(['open', 'merged', 'closed', 'draft']),
  author: z.string(),
  created: z.date(),
  updated: z.date(),
  url: z.string(),
  conflicts: z.array(z.object({
    file: z.string(),
    type: z.enum(['content', 'delete/modify', 'add/add'])
  })).optional()
});

export type PullRequest = z.infer<typeof PullRequestSchema>;

// Operation Types
export const CloneOptionsSchema = z.object({
  depth: z.number().optional(),
  branch: z.string().optional(),
  recursive: z.boolean().optional(),
  mirror: z.boolean().optional()
});

export type CloneOptions = z.infer<typeof CloneOptionsSchema>;

export const CommitOptionsSchema = z.object({
  author: z.object({
    name: z.string(),
    email: z.string()
  }).optional(),
  allowEmpty: z.boolean().optional(),
  amend: z.boolean().optional()
});

export type CommitOptions = z.infer<typeof CommitOptionsSchema>;

export const MergeOptionsSchema = z.object({
  strategy: z.enum(['merge', 'squash', 'rebase']),
  message: z.string().optional(),
  fastForward: z.boolean().optional()
});

export type MergeOptions = z.infer<typeof MergeOptionsSchema>;

export const PushOptionsSchema = z.object({
  force: z.boolean().optional(),
  tags: z.boolean().optional(),
  upstream: z.boolean().optional()
});

export type PushOptions = z.infer<typeof PushOptionsSchema>;

// Result Types
export const OperationResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  error: z.string().optional(),
  timestamp: z.date()
});

export type OperationResult = z.infer<typeof OperationResultSchema>;

export const MergeResultSchema = z.object({
  success: z.boolean(),
  conflicts: z.array(z.object({
    file: z.string(),
    type: z.enum(['content', 'delete/modify', 'add/add']),
    sections: z.array(z.object({
      start: z.number(),
      end: z.number(),
      content: z.string()
    })).optional()
  })),
  commit: z.string().optional()
});

export type MergeResult = z.infer<typeof MergeResultSchema>;

// API Request/Response Types
export const GitRequestSchema = z.object({
  repositoryId: z.string(),
  operation: z.string(),
  parameters: z.record(z.any()).optional(),
  credentials: CredentialsSchema.optional()
});

export type GitRequest = z.infer<typeof GitRequestSchema>;

export const GitResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.date()
});

export type GitResponse = z.infer<typeof GitResponseSchema>;

// Configuration Types
export const GitServiceConfigSchema = z.object({
  workspaceRoot: z.string(),
  maxRepositories: z.number().default(100),
  defaultBranch: z.string().default('main'),
  encryptionKey: z.string(),
  redis: z.object({
    host: z.string(),
    port: z.number(),
    password: z.string().optional()
  }),
  github: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional()
  }).optional(),
  gitlab: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional()
  }).optional()
});

export type GitServiceConfig = z.infer<typeof GitServiceConfigSchema>;