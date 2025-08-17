/**
 * Agent Message Validation Schemas
 * Comprehensive validation schemas for all agent communication types
 * 
 * Maya Rodriguez - Data Processing & CSV Expert
 * P0 Implementation for critical security validation pipeline
 */

import { z } from 'zod';

// ============================================================================
// Base Validation Schemas
// ============================================================================

export const AgentIdSchema = z.string()
  .min(1, 'Agent ID cannot be empty')
  .max(100, 'Agent ID too long')
  .regex(/^[a-zA-Z0-9-_:.]+$/, 'Agent ID contains invalid characters');

export const MessageIdSchema = z.string()
  .uuid('Message ID must be a valid UUID');

export const TaskIdSchema = z.string()
  .min(1, 'Task ID cannot be empty')
  .max(100, 'Task ID too long');

export const ChannelIdSchema = z.string()
  .min(1, 'Channel ID cannot be empty')
  .max(50, 'Channel ID too long')
  .regex(/^[a-zA-Z0-9-_]+$/, 'Channel ID contains invalid characters');

export const TimestampSchema = z.number()
  .int('Timestamp must be an integer')
  .min(0, 'Timestamp cannot be negative')
  .max(Date.now() + (365 * 24 * 60 * 60 * 1000), 'Timestamp cannot be more than 1 year in the future');

export const ContentSchema = z.string()
  .min(1, 'Content cannot be empty')
  .max(10000, 'Content exceeds maximum length of 10,000 characters')
  .refine(
    (content) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content),
    'Content cannot contain script tags'
  );

export const MetadataSchema = z.record(z.unknown()).optional();

// ============================================================================
// Agent Message Validation
// ============================================================================

export const AgentMessageSchema = z.object({
  id: MessageIdSchema,
  from: AgentIdSchema,
  to: AgentIdSchema,
  content: ContentSchema,
  type: z.enum(['direct', 'request', 'response'], {
    errorMap: () => ({ message: 'Message type must be direct, request, or response' })
  }),
  timestamp: TimestampSchema,
  correlationId: z.string().uuid().optional(),
  metadata: MetadataSchema
}).strict()
  .refine((data) => data.from !== data.to, {
    message: 'Agent cannot send message to itself',
    path: ['to']
  })
  .refine((data) => {
    // Validate timestamp is recent (within last 5 minutes for new messages)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return data.timestamp >= fiveMinutesAgo;
  }, {
    message: 'Message timestamp is too old (must be within 5 minutes)',
    path: ['timestamp']
  });

// ============================================================================
// Broadcast Message Validation
// ============================================================================

export const BroadcastMessageSchema = z.object({
  id: MessageIdSchema,
  from: AgentIdSchema,
  channel: ChannelIdSchema,
  content: ContentSchema,
  type: z.enum(['event', 'status', 'alert', 'announcement'], {
    errorMap: () => ({ message: 'Broadcast type must be event, status, alert, or announcement' })
  }),
  timestamp: TimestampSchema,
  metadata: MetadataSchema
}).strict();

// ============================================================================
// Task and Context Validation
// ============================================================================

export const TaskSchema = z.object({
  id: TaskIdSchema,
  title: z.string().min(1, 'Task title cannot be empty').max(200, 'Task title too long'),
  description: z.string().min(1, 'Task description cannot be empty').max(5000, 'Task description too long'),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']),
  assignedTo: AgentIdSchema.optional(),
  createdBy: AgentIdSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  dueDate: TimestampSchema.optional(),
  tags: z.array(z.string().max(50)).max(20, 'Too many tags').optional(),
  requirements: z.array(z.string().max(500)).max(50, 'Too many requirements').optional(),
  acceptanceCriteria: z.array(z.string().max(500)).max(20, 'Too many acceptance criteria').optional()
}).strict()
  .refine((data) => data.updatedAt >= data.createdAt, {
    message: 'Updated timestamp cannot be before created timestamp',
    path: ['updatedAt']
  })
  .refine((data) => !data.dueDate || data.dueDate >= data.createdAt, {
    message: 'Due date cannot be before creation date',
    path: ['dueDate']
  });

export const FileReferenceSchema = z.object({
  path: z.string().min(1, 'File path cannot be empty').max(500, 'File path too long'),
  hash: z.string().regex(/^[a-fA-F0-9]+$/, 'Invalid file hash format'),
  size: z.number().int().min(0, 'File size cannot be negative').max(1024 * 1024 * 1024, 'File too large (max 1GB)'),
  lastModified: TimestampSchema,
  content: z.string().max(1024 * 1024, 'File content too large (max 1MB)').optional()
}).strict();

export const MementoSnapshotSchema = z.object({
  entities: z.array(z.record(z.unknown())).max(1000, 'Too many entities'),
  relations: z.array(z.record(z.unknown())).max(1000, 'Too many relations'),
  observations: z.array(z.record(z.unknown())).max(1000, 'Too many observations'),
  timestamp: TimestampSchema
}).strict();

export const TaskContextSchema = z.object({
  task: TaskSchema,
  context: z.record(z.unknown()),
  memento: MementoSnapshotSchema.optional(),
  files: z.array(FileReferenceSchema).max(100, 'Too many file references').optional(),
  dependencies: z.array(z.string()).max(50, 'Too many dependencies').optional()
}).strict();

// ============================================================================
// Task Handoff Validation
// ============================================================================

export const TaskHandoffSchema = z.object({
  id: MessageIdSchema,
  from: AgentIdSchema,
  to: AgentIdSchema,
  task: TaskContextSchema,
  reason: z.string().min(1, 'Handoff reason cannot be empty').max(1000, 'Handoff reason too long'),
  timestamp: TimestampSchema,
  status: z.enum(['pending', 'accepted', 'rejected', 'expired']),
  expiresAt: TimestampSchema
}).strict()
  .refine((data) => data.from !== data.to, {
    message: 'Cannot handoff task to the same agent',
    path: ['to']
  })
  .refine((data) => data.expiresAt > data.timestamp, {
    message: 'Expiration time must be after handoff timestamp',
    path: ['expiresAt']
  })
  .refine((data) => {
    // Handoff cannot expire more than 24 hours in the future
    const maxExpiration = data.timestamp + (24 * 60 * 60 * 1000);
    return data.expiresAt <= maxExpiration;
  }, {
    message: 'Handoff expiration cannot be more than 24 hours from creation',
    path: ['expiresAt']
  });

export const TaskHandoffResponseSchema = z.object({
  handoffId: MessageIdSchema,
  from: AgentIdSchema,
  to: AgentIdSchema,
  status: z.enum(['accepted', 'rejected']),
  reason: z.string().max(1000, 'Response reason too long').optional(),
  timestamp: TimestampSchema
}).strict()
  .refine((data) => data.from !== data.to, {
    message: 'Response from and to agents cannot be the same',
    path: ['to']
  });

// ============================================================================
// Event Validation
// ============================================================================

export const AgentEventSchema = z.object({
  id: MessageIdSchema,
  agentId: AgentIdSchema,
  type: z.enum(['spawned', 'terminated', 'status_change', 'error', 'warning', 'info']),
  data: z.record(z.unknown()),
  timestamp: TimestampSchema,
  source: z.string().min(1, 'Event source cannot be empty').max(100, 'Event source too long')
}).strict();

// ============================================================================
// WebSocket Message Validation
// ============================================================================

export const WSMessageBaseSchema = z.object({
  id: MessageIdSchema,
  type: z.string().min(1, 'Message type cannot be empty'),
  timestamp: TimestampSchema,
  payload: z.unknown(),
  metadata: z.object({
    correlationId: z.string().uuid().optional(),
    agentId: AgentIdSchema.optional(),
    priority: z.enum(['low', 'normal', 'high']).optional()
  }).optional()
}).strict();

// ============================================================================
// Audit Log Validation
// ============================================================================

export const CommunicationAuditLogSchema = z.object({
  id: MessageIdSchema,
  timestamp: TimestampSchema,
  type: z.enum(['message', 'broadcast', 'handoff', 'event']),
  participants: z.array(AgentIdSchema).min(1, 'At least one participant required').max(100, 'Too many participants'),
  action: z.string().min(1, 'Action cannot be empty').max(100, 'Action description too long'),
  data: z.record(z.unknown()),
  metadata: z.object({
    clientIp: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IP address format').optional(),
    userAgent: z.string().max(500).optional(),
    sessionId: z.string().uuid().optional()
  }).optional()
}).strict();

// ============================================================================
// Validation Schema Map
// ============================================================================

export const ValidationSchemaMap = {
  AgentMessage: AgentMessageSchema,
  BroadcastMessage: BroadcastMessageSchema,
  TaskHandoff: TaskHandoffSchema,
  TaskHandoffResponse: TaskHandoffResponseSchema,
  AgentEvent: AgentEventSchema,
  WSMessage: WSMessageBaseSchema,
  CommunicationAuditLog: CommunicationAuditLogSchema,
  Task: TaskSchema,
  TaskContext: TaskContextSchema,
  FileReference: FileReferenceSchema,
  MementoSnapshot: MementoSnapshotSchema
} as const;

export type ValidationSchemaType = keyof typeof ValidationSchemaMap;