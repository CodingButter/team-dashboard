/**
 * Authentication & Authorization API Contracts
 * Types for user authentication and session management
 */

import { UserRole } from './common';
import { ApiResponse } from './common';

export interface LoginRequest {
  username: string;
  password: string;
  totp?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: string[];
  preferences: UserPreferences;
  createdAt: string;
  lastLogin: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  terminalFont: string;
  terminalFontSize: number;
  shortcuts: Record<string, string>;
  defaultWorkspace: string;
  autoSaveSession: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
}

export interface Session {
  id: string;
  userId: string;
  agentIds: string[];
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
}

export interface SessionState {
  agents: any[]; // Agent[] imported from agents module
  subscriptions: string[];
  preferences: UserPreferences;
}

// Authentication API Endpoints
export interface AuthApiEndpoints {
  'POST /api/auth/login': (body: LoginRequest) => Promise<ApiResponse<LoginResponse>>;
  'POST /api/auth/logout': () => Promise<ApiResponse<void>>;
  'POST /api/auth/refresh': (body: RefreshTokenRequest) => Promise<ApiResponse<RefreshTokenResponse>>;
  'GET /api/auth/me': () => Promise<ApiResponse<User>>;
}

// Session Management API Endpoints
export interface SessionApiEndpoints {
  'GET /api/session': () => Promise<ApiResponse<Session>>;
  'POST /api/session/save': (state: SessionState) => Promise<ApiResponse<void>>;
  'POST /api/session/restore': (sessionId: string) => Promise<ApiResponse<SessionState>>;
}