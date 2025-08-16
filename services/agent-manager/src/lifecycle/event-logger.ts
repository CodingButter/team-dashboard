/**
 * Agent Lifecycle Event Logger
 * Comprehensive logging and persistence of agent lifecycle events
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  AgentStatus
} from '@team-dashboard/types';

export interface LifecycleEvent {
  id: string;
  agentId: string;
  type: LifecycleEventType;
  status?: AgentStatus;
  timestamp: number;
  data?: any;
  metadata?: {
    previousStatus?: AgentStatus;
    reason?: string;
    duration?: number;
    resourceUsage?: any;
    errorDetails?: any;
  };
}

export type LifecycleEventType = 
  | 'agent:registered'
  | 'agent:starting'
  | 'agent:started' 
  | 'agent:idle'
  | 'agent:busy'
  | 'agent:paused'
  | 'agent:resumed'
  | 'agent:stopping'
  | 'agent:stopped'
  | 'agent:crashed'
  | 'agent:error'
  | 'agent:terminated'
  | 'agent:restart_attempt'
  | 'agent:restart_success'
  | 'agent:restart_failed'
  | 'agent:health_check'
  | 'agent:health_warning'
  | 'agent:health_critical'
  | 'agent:resource_alert'
  | 'agent:limit_exceeded'
  | 'agent:cleanup_started'
  | 'agent:cleanup_completed';

export interface EventLoggerConfig {
  enabled: boolean;
  logToFile: boolean;
  logToConsole: boolean;
  logFilePath: string;
  rotateLogFiles: boolean;
  maxLogFileSize: number; // bytes
  maxLogFiles: number;
  persistEvents: boolean;
  eventRetentionDays: number;
  bufferSize: number;
  flushInterval: number; // ms
}

/**
 * High-Performance Event Logger for Agent Lifecycle
 * Optimized for high-throughput logging with buffering and rotation
 */
export class AgentLifecycleEventLogger extends EventEmitter {
  private config: EventLoggerConfig;
  private eventBuffer: LifecycleEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private logFileHandle?: fs.FileHandle;
  private currentLogFile?: string;
  private isShuttingDown = false;
  private eventCounter = 0;

  constructor(config: Partial<EventLoggerConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      logToFile: true,
      logToConsole: true,
      logFilePath: path.join(process.cwd(), 'logs', 'agent-lifecycle.log'),
      rotateLogFiles: true,
      maxLogFileSize: 10 * 1024 * 1024, // 10MB
      maxLogFiles: 5,
      persistEvents: true,
      eventRetentionDays: 30,
      bufferSize: 100,
      flushInterval: 5000, // 5 seconds
      ...config
    };

    this.startFlushTimer();
    this.ensureLogDirectory();
  }

  /**
   * Log a lifecycle event with performance optimization
   */
  logEvent(agentId: string, type: LifecycleEventType, data?: any, metadata?: any): string {
    if (!this.config.enabled || this.isShuttingDown) {
      return '';
    }

    const eventId = this.generateEventId();
    const event: LifecycleEvent = {
      id: eventId,
      agentId,
      type,
      timestamp: Date.now(),
      data,
      metadata
    };

    // Add to buffer for batch processing
    this.eventBuffer.push(event);

    // Console logging for immediate feedback
    if (this.config.logToConsole) {
      this.logToConsole(event);
    }

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.bufferSize) {
      this.flushEvents().catch(error => {
        console.error('[EventLogger] Failed to flush events:', error);
      });
    }

    this.emit('event:logged', event);
    return eventId;
  }

  /**
   * Log agent state change with context
   */
  logStateChange(agentId: string, fromStatus: AgentStatus, toStatus: AgentStatus, 
                 reason?: string, duration?: number, resourceUsage?: any): string {
    
    const type = this.getEventTypeFromStatus(toStatus);
    return this.logEvent(agentId, type, { fromStatus, toStatus }, {
      previousStatus: fromStatus,
      reason,
      duration,
      resourceUsage
    });
  }

  /**
   * Log agent error with detailed information
   */
  logError(agentId: string, error: Error, context?: any): string {
    return this.logEvent(agentId, 'agent:error', { error: error.message, context }, {
      errorDetails: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        context
      }
    });
  }

  /**
   * Log resource alert
   */
  logResourceAlert(agentId: string, alertType: string, level: string, 
                   value: number, threshold: number, message: string): string {
    return this.logEvent(agentId, 'agent:resource_alert', {
      alertType,
      level,
      value,
      threshold,
      message
    });
  }

  /**
   * Log health check result
   */
  logHealthCheck(agentId: string, healthy: boolean, checks: any[]): string {
    const type = healthy ? 'agent:health_check' : 'agent:health_warning';
    return this.logEvent(agentId, type, { healthy, checks });
  }

  /**
   * Get event type from agent status
   */
  private getEventTypeFromStatus(status: AgentStatus): LifecycleEventType {
    const statusMap: Record<AgentStatus, LifecycleEventType> = {
      'starting': 'agent:starting',
      'idle': 'agent:idle',
      'busy': 'agent:busy',
      'running': 'agent:started',
      'paused': 'agent:paused',
      'stopping': 'agent:stopping',
      'stopped': 'agent:stopped',
      'error': 'agent:error',
      'crashed': 'agent:crashed',
      'terminated': 'agent:terminated',
      'ready': 'agent:started',
      'spawned': 'agent:started',
      'exited': 'agent:stopped'
    };

    return statusMap[status] || 'agent:error';
  }

  /**
   * Console logging with formatted output
   */
  private logToConsole(event: LifecycleEvent): void {
    const timestamp = new Date(event.timestamp).toISOString();
    const level = this.getLogLevel(event.type);
    const message = this.formatEventMessage(event);
    
    const logLine = `[${timestamp}] [${level}] [${event.agentId}] ${message}`;
    
    switch (level) {
      case 'ERROR':
      case 'CRITICAL':
        console.error(logLine);
        break;
      case 'WARN':
        console.warn(logLine);
        break;
      case 'INFO':
      default:
        console.log(logLine);
        break;
    }
  }

  /**
   * Get log level from event type
   */
  private getLogLevel(type: LifecycleEventType): string {
    if (type.includes('error') || type.includes('crashed') || type.includes('failed')) {
      return 'ERROR';
    }
    if (type.includes('warning') || type.includes('critical') || type.includes('alert')) {
      return 'WARN';
    }
    return 'INFO';
  }

  /**
   * Format event message for display
   */
  private formatEventMessage(event: LifecycleEvent): string {
    const { type, data, metadata } = event;
    
    switch (type) {
      case 'agent:starting':
        return 'Agent starting up';
      case 'agent:started':
        return 'Agent started successfully';
      case 'agent:idle':
        return 'Agent entered idle state';
      case 'agent:busy':
        return 'Agent entered busy state';
      case 'agent:stopped':
        return `Agent stopped (reason: ${metadata?.reason || 'unknown'})`;
      case 'agent:crashed':
        return `Agent crashed (reason: ${metadata?.reason || 'unknown'})`;
      case 'agent:restart_attempt':
        return `Restart attempt ${data?.attempt || '?'} initiated`;
      case 'agent:resource_alert':
        return `${data?.level?.toUpperCase()} resource alert: ${data?.message}`;
      case 'agent:health_warning':
        return `Health check failed: ${data?.checks?.filter((c: any) => !c.success).length || 0} failures`;
      default:
        return `${type.replace('agent:', '').replace('_', ' ')}`;
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flushEvents().catch(error => {
          console.error('[EventLogger] Scheduled flush failed:', error);
        });
      }
    }, this.config.flushInterval);
  }

  /**
   * Flush buffered events to file
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0 || !this.config.logToFile) {
      return;
    }

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.ensureLogFile();
      
      const logLines = eventsToFlush.map(event => 
        JSON.stringify(event) + '\n'
      ).join('');

      if (this.logFileHandle) {
        await this.logFileHandle.write(logLines);
        await this.logFileHandle.sync(); // Force write to disk
      }

      // Check if log rotation is needed
      if (this.config.rotateLogFiles) {
        await this.checkLogRotation();
      }

    } catch (error) {
      console.error('[EventLogger] Failed to flush events to file:', error);
      // Put events back in buffer to retry
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      const logDir = path.dirname(this.config.logFilePath);
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('[EventLogger] Failed to create log directory:', error);
    }
  }

  /**
   * Ensure log file is open
   */
  private async ensureLogFile(): Promise<void> {
    if (this.logFileHandle && this.currentLogFile === this.config.logFilePath) {
      return;
    }

    // Close existing handle
    if (this.logFileHandle) {
      await this.logFileHandle.close();
    }

    // Open new file handle
    this.logFileHandle = await fs.open(this.config.logFilePath, 'a');
    this.currentLogFile = this.config.logFilePath;
  }

  /**
   * Check if log rotation is needed
   */
  private async checkLogRotation(): Promise<void> {
    try {
      if (!this.currentLogFile) return;

      const stats = await fs.stat(this.currentLogFile);
      if (stats.size >= this.config.maxLogFileSize) {
        await this.rotateLogFile();
      }
    } catch (error) {
      console.error('[EventLogger] Failed to check log rotation:', error);
    }
  }

  /**
   * Rotate log file
   */
  private async rotateLogFile(): Promise<void> {
    if (!this.currentLogFile) return;

    try {
      // Close current file
      if (this.logFileHandle) {
        await this.logFileHandle.close();
        this.logFileHandle = undefined;
      }

      // Rotate existing files
      const baseFilename = this.config.logFilePath;
      const ext = path.extname(baseFilename);
      const basename = baseFilename.slice(0, -ext.length);

      // Move existing rotated files
      for (let i = this.config.maxLogFiles - 1; i > 0; i--) {
        const fromFile = `${basename}.${i}${ext}`;
        const toFile = `${basename}.${i + 1}${ext}`;
        
        try {
          await fs.access(fromFile);
          if (i === this.config.maxLogFiles - 1) {
            await fs.unlink(fromFile); // Delete oldest
          } else {
            await fs.rename(fromFile, toFile);
          }
        } catch (error) {
          // File doesn't exist, continue
        }
      }

      // Move current file to .1
      await fs.rename(baseFilename, `${basename}.1${ext}`);
      
      console.log(`[EventLogger] Log file rotated: ${baseFilename}`);

    } catch (error) {
      console.error('[EventLogger] Failed to rotate log file:', error);
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    this.eventCounter++;
    return `evt_${Date.now()}_${this.eventCounter}`;
  }

  /**
   * Get events for an agent (from file)
   */
  async getAgentEvents(agentId: string, limit = 100): Promise<LifecycleEvent[]> {
    try {
      const events: LifecycleEvent[] = [];
      const logContent = await fs.readFile(this.config.logFilePath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      // Parse events from most recent first
      for (let i = lines.length - 1; i >= 0 && events.length < limit; i--) {
        try {
          const event = JSON.parse(lines[i]);
          if (event.agentId === agentId) {
            events.push(event);
          }
        } catch (error) {
          // Skip invalid JSON lines
        }
      }

      return events.reverse(); // Return in chronological order
    } catch (error) {
      console.error('[EventLogger] Failed to read agent events:', error);
      return [];
    }
  }

  /**
   * Get all recent events
   */
  async getRecentEvents(limit = 100): Promise<LifecycleEvent[]> {
    try {
      const events: LifecycleEvent[] = [];
      const logContent = await fs.readFile(this.config.logFilePath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      // Get most recent events
      for (let i = lines.length - 1; i >= 0 && events.length < limit; i--) {
        try {
          const event = JSON.parse(lines[i]);
          events.push(event);
        } catch (error) {
          // Skip invalid JSON lines
        }
      }

      return events.reverse(); // Return in chronological order
    } catch (error) {
      console.error('[EventLogger] Failed to read recent events:', error);
      return [];
    }
  }

  /**
   * Shutdown event logger
   */
  async shutdown(): Promise<void> {
    console.log('[EventLogger] Shutting down event logger...');
    this.isShuttingDown = true;
    
    // Clear flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Flush remaining events
    if (this.eventBuffer.length > 0) {
      console.log(`[EventLogger] Flushing ${this.eventBuffer.length} remaining events...`);
      await this.flushEvents();
    }

    // Close log file
    if (this.logFileHandle) {
      await this.logFileHandle.close();
      this.logFileHandle = undefined;
    }

    console.log('[EventLogger] Event logger shutdown complete');
  }
}

export default AgentLifecycleEventLogger;