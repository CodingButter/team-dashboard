/**
 * GitHub Integration API Contracts
 * Types for GitHub issues, pull requests, and webhooks
 */

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  assignees: string[];
  labels: string[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head: string;
  base: string;
  assignees: string[];
  reviewers: string[];
  labels: string[];
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
}

export interface GitHubWebhookEvent {
  type: 'issues' | 'pull_request' | 'push' | 'workflow_run';
  action: string;
  payload: any;
  repository: string;
  sender: string;
  timestamp: string;
}