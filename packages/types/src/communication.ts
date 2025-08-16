/**
 * Inter-Agent Communication Types
 * Type definitions for agent-to-agent messaging, broadcasting, and task handoff
 */

// ============================================================================
// Core Communication Types
// ============================================================================

export type AgentId = string;
export type MessageId = string;
export type TaskId = string;
export type ChannelId = string;

export interface AgentMessage {
  id: MessageId;
  from: AgentId;
  to: AgentId;
  content: string;
  type: 'direct' | 'request' | 'response';
  timestamp: number;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface BroadcastMessage {
  id: MessageId;
  from: AgentId;
  channel: ChannelId;
  content: string;
  type: 'event' | 'status' | 'alert' | 'announcement';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Task Handoff Types
// ============================================================================

export interface TaskContext {
  task: Task;
  context: Record<string, unknown>;
  memento?: MementoSnapshot;
  files?: FileReference[];
  dependencies?: string[];
}

export interface Task {
  id: TaskId;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  assignedTo?: AgentId;
  createdBy: AgentId;
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  tags?: string[];
  requirements?: string[];
  acceptanceCriteria?: string[];
}

export interface TaskHandoff {
  id: string;
  from: AgentId;
  to: AgentId;
  task: TaskContext;
  reason: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt: number;
}

export interface TaskHandoffResponse {
  handoffId: string;
  from: AgentId;
  to: AgentId;
  status: 'accepted' | 'rejected';
  reason?: string;
  timestamp: number;
}

// ============================================================================
// Memory and Context Types
// ============================================================================

export interface MementoSnapshot {
  entities: Record<string, unknown>[];
  relations: Record<string, unknown>[];
  observations: Record<string, unknown>[];
  timestamp: number;
}

export interface FileReference {
  path: string;
  hash: string;
  size: number;
  lastModified: number;
  content?: string;
}

// ============================================================================
// Communication Configuration
// ============================================================================

export interface CommunicationConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  channels: {
    direct: string;
    broadcast: string;
    handoff: string;
    events: string;
  };
  messageRetention: {
    direct: number; // milliseconds
    broadcast: number;
    handoff: number;
  };
  rateLimits: {
    messagesPerMinute: number;
    broadcastsPerMinute: number;
    handoffsPerHour: number;
  };
}

// ============================================================================
// Event Types
// ============================================================================

export interface AgentEvent {
  id: string;
  agentId: AgentId;
  type: 'spawned' | 'terminated' | 'status_change' | 'error' | 'warning' | 'info';
  data: Record<string, unknown>;
  timestamp: number;
  source: string;
}

export interface CommunicationEvent {
  id: string;
  type: 'message_sent' | 'message_received' | 'broadcast_sent' | 'handoff_initiated' | 'handoff_completed';
  participants: AgentId[];
  data: Record<string, unknown>;
  timestamp: number;
}

// ============================================================================
// Communication Interface
// ============================================================================

export interface AgentCommunication {
  // Direct messaging
  sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void>;
  receiveMessage(handler: (message: AgentMessage) => void): void;
  
  // Broadcasting
  broadcast(message: Omit<BroadcastMessage, 'id' | 'timestamp'>): Promise<void>;
  subscribeToChannel(channel: ChannelId, handler: (message: BroadcastMessage) => void): void;
  unsubscribeFromChannel(channel: ChannelId): void;
  
  // Task handoff
  initiateHandoff(handoff: Omit<TaskHandoff, 'id' | 'timestamp' | 'status' | 'expiresAt'>): Promise<string>;
  respondToHandoff(response: Omit<TaskHandoffResponse, 'timestamp'>): Promise<void>;
  subscribeToHandoffs(agentId: AgentId, handler: (handoff: TaskHandoff) => void): void;
  
  // Event handling
  publishEvent(event: Omit<AgentEvent, 'id' | 'timestamp'>): Promise<void>;
  subscribeToEvents(handler: (event: AgentEvent) => void): void;
  
  // Message history and queuing
  getMessageHistory(agentId: AgentId, limit?: number): Promise<AgentMessage[]>;
  getHandoffHistory(agentId: AgentId, limit?: number): Promise<TaskHandoff[]>;
  
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

// ============================================================================
// Audit and Logging Types
// ============================================================================

export interface CommunicationAuditLog {
  id: string;
  timestamp: number;
  type: 'message' | 'broadcast' | 'handoff' | 'event';
  participants: AgentId[];
  action: string;
  data: Record<string, unknown>;
  metadata?: {
    clientIp?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

export interface MessageDeliveryStatus {
  messageId: MessageId;
  status: 'pending' | 'delivered' | 'failed' | 'expired';
  attempts: number;
  lastAttempt: number;
  nextRetry?: number;
  error?: string;
}