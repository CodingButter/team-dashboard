import axios, { AxiosInstance } from 'axios';
import { PullRequest, Credentials } from '../types.js';

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  state: 'open' | 'closed';
  merged: boolean;
  draft: boolean;
  user: {
    login: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  mergeable: boolean | null;
  mergeable_state: string;
}

export interface GitHubRepository {
  owner: string;
  repo: string;
}

export class GitHubProvider {
  private client: AxiosInstance;
  private credentials: Credentials;

  constructor(credentials: Credentials) {
    this.credentials = credentials;
    
    let authHeader = '';
    if (credentials.type === 'token') {
      authHeader = `token ${credentials.token}`;
    } else if (credentials.type === 'oauth') {
      authHeader = `Bearer ${credentials.accessToken}`;
    }

    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'team-dashboard-git-service/1.0'
      }
    });
  }

  /**
   * Parse repository URL to extract owner and repo
   */
  private parseRepositoryUrl(url: string): GitHubRepository {
    const match = url.match(/github\.com[\/:]([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }
    return {
      owner: match[1],
      repo: match[2]
    };
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    repositoryUrl: string,
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<PullRequest> {
    const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
    
    try {
      const response = await this.client.post(`/repos/${owner}/${repo}/pulls`, {
        title,
        body,
        head,
        base,
        maintainer_can_modify: true
      });

      const pr: GitHubPullRequest = response.data;
      
      return this.convertToPullRequest(pr);
    } catch (error: any) {
      throw new Error(`Failed to create pull request: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get pull request by number
   */
  async getPullRequest(repositoryUrl: string, prNumber: number): Promise<PullRequest> {
    const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
    
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/pulls/${prNumber}`);
      const pr: GitHubPullRequest = response.data;
      
      return this.convertToPullRequest(pr);
    } catch (error: any) {
      throw new Error(`Failed to get pull request: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * List pull requests
   */
  async listPullRequests(
    repositoryUrl: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<PullRequest[]> {
    const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
    
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/pulls`, {
        params: { state, per_page: 100 }
      });

      const prs: GitHubPullRequest[] = response.data;
      
      return prs.map(pr => this.convertToPullRequest(pr));
    } catch (error: any) {
      throw new Error(`Failed to list pull requests: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Merge a pull request
   */
  async mergePullRequest(
    repositoryUrl: string,
    prNumber: number,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge',
    commitTitle?: string,
    commitMessage?: string
  ): Promise<{ success: boolean; sha?: string; message: string }> {
    const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
    
    try {
      const response = await this.client.put(`/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
        commit_title: commitTitle,
        commit_message: commitMessage,
        merge_method: mergeMethod
      });

      return {
        success: true,
        sha: response.data.sha,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Close a pull request
   */
  async closePullRequest(repositoryUrl: string, prNumber: number): Promise<PullRequest> {
    const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
    
    try {
      const response = await this.client.patch(`/repos/${owner}/${repo}/pulls/${prNumber}`, {
        state: 'closed'
      });

      const pr: GitHubPullRequest = response.data;
      
      return this.convertToPullRequest(pr);
    } catch (error: any) {
      throw new Error(`Failed to close pull request: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Add a comment to a pull request
   */
  async addComment(
    repositoryUrl: string,
    prNumber: number,
    body: string
  ): Promise<void> {
    const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
    
    try {
      await this.client.post(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
        body
      });
    } catch (error: any) {
      throw new Error(`Failed to add comment: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get pull request conflicts
   */
  async getPullRequestConflicts(
    repositoryUrl: string,
    prNumber: number
  ): Promise<Array<{ file: string; type: string }>> {
    const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
    
    try {
      // Get PR details to check mergeable state
      const prResponse = await this.client.get(`/repos/${owner}/${repo}/pulls/${prNumber}`);
      const pr: GitHubPullRequest = prResponse.data;
      
      if (pr.mergeable === false && pr.mergeable_state === 'dirty') {
        // Get files with conflicts
        const filesResponse = await this.client.get(`/repos/${owner}/${repo}/pulls/${prNumber}/files`);
        
        return filesResponse.data
          .filter((file: any) => file.status === 'modified')
          .map((file: any) => ({
            file: file.filename,
            type: 'content'
          }));
      }
      
      return [];
    } catch (error: any) {
      throw new Error(`Failed to get conflicts: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Request review for a pull request
   */
  async requestReview(
    repositoryUrl: string,
    prNumber: number,
    reviewers: string[],
    teamReviewers?: string[]
  ): Promise<void> {
    const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
    
    try {
      await this.client.post(`/repos/${owner}/${repo}/pulls/${prNumber}/requested_reviewers`, {
        reviewers,
        team_reviewers: teamReviewers
      });
    } catch (error: any) {
      throw new Error(`Failed to request review: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get repository information
   */
  async getRepository(repositoryUrl: string): Promise<any> {
    const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
    
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get repository: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Check if repository exists and is accessible
   */
  async validateAccess(repositoryUrl: string): Promise<boolean> {
    try {
      await this.getRepository(repositoryUrl);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert GitHub PR to our PullRequest format
   */
  private convertToPullRequest(githubPr: GitHubPullRequest): PullRequest {
    let status: 'open' | 'merged' | 'closed' | 'draft';
    
    if (githubPr.draft) {
      status = 'draft';
    } else if (githubPr.merged) {
      status = 'merged';
    } else if (githubPr.state === 'closed') {
      status = 'closed';
    } else {
      status = 'open';
    }

    return {
      id: githubPr.number,
      title: githubPr.title,
      description: githubPr.body || '',
      source: githubPr.head.ref,
      target: githubPr.base.ref,
      status,
      author: githubPr.user.login,
      created: new Date(githubPr.created_at),
      updated: new Date(githubPr.updated_at),
      url: githubPr.html_url,
      conflicts: githubPr.mergeable === false ? [{ file: 'unknown', type: 'content' }] : undefined
    };
  }
}