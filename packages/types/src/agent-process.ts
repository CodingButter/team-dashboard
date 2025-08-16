/**
 * Agent Process Management Types
 * Defines interfaces for agent spawning, process control, and PTY management
 */

import { AgentModel, AgentStatus } from './api-contracts';

/**
 * Configuration for spawning a new agent process
 */
export interface AgentSpawnConfig {
  id: string;
  name: string;
  model: AgentModel;
  workspace: string;
  environment?: Record<string, string>;
  resourceLimits?: ResourceLimits;
  dockerConfig?: DockerConfig;
  ptyOptions?: PtyOptions;
}

/**
 * Resource limits for agent processes
 */
export interface ResourceLimits {
  memory: number;        // Memory limit in MB
  cpu: number;          // CPU limit as percentage (0-100)
  diskSpace?: number;   // Disk space limit in MB
  networkBandwidth?: number; // Network bandwidth in Mbps
  maxProcesses?: number;    // Maximum number of child processes
  timeout?: number;         // Maximum execution time in seconds
}

/**
 * Docker container configuration for agent isolation
 */
export interface DockerConfig {
  image: string;              // Docker image name
  tag?: string;              // Image tag (default: latest)
  volumes?: VolumeMount[];   // Volume mounts
  network?: string;          // Network mode
  privileged?: boolean;      // Run in privileged mode
  capabilities?: string[];   // Linux capabilities
  securityOpts?: string[];   // Security options
}

/**
 * Volume mount configuration
 */
export interface VolumeMount {
  source: string;      // Host path or volume name
  target: string;      // Container path
  readonly?: boolean;  // Read-only mount
  type?: 'bind' | 'volume' | 'tmpfs';
}

/**
 * PTY (Pseudo-Terminal) options for interactive sessions
 */
export interface PtyOptions {
  cols?: number;       // Terminal columns (default: 80)
  rows?: number;       // Terminal rows (default: 24)
  cwd?: string;       // Working directory
  env?: Record<string, string>; // Environment variables
  shell?: string;     // Shell to use (default: /bin/bash)
  encoding?: string;  // Character encoding (default: utf8)
}

/**
 * Agent process instance with PTY support
 */
export interface AgentProcess {
  id: string;
  pid: number;
  pty?: any;          // node-pty instance
  container?: ContainerInfo;
  status: AgentStatus;
  startTime: number;
  resourceUsage?: ResourceUsage;
  
  // Methods
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
  pause(): void;
  resume(): void;
}

/**
 * Docker container information
 */
export interface ContainerInfo {
  id: string;          // Container ID
  name: string;        // Container name
  image: string;       // Image used
  status: string;      // Container status
  ports: PortMapping[];
  networks: string[];
}

/**
 * Port mapping for container
 */
export interface PortMapping {
  host: number;
  container: number;
  protocol: 'tcp' | 'udp';
}

/**
 * Real-time resource usage metrics
 */
export interface ResourceUsage {
  cpu: {
    percent: number;
    system: number;
    user: number;
  };
  memory: {
    rss: number;       // Resident Set Size
    heap: number;      // Heap usage
    external: number;  // External memory
  };
  io: {
    readBytes: number;
    writeBytes: number;
    readOps: number;
    writeOps: number;
  };
  network: {
    rxBytes: number;
    txBytes: number;
    rxPackets: number;
    txPackets: number;
  };
}

/**
 * Agent process event types
 */
export type AgentProcessEvent = 
  | 'spawn'
  | 'ready'
  | 'data'
  | 'error'
  | 'exit'
  | 'pause'
  | 'resume'
  | 'resource-limit'
  | 'health-check';

/**
 * Agent process event data
 */
export interface AgentProcessEventData {
  type: AgentProcessEvent;
  agentId: string;
  timestamp: number;
  data?: any;
  error?: Error;
}

/**
 * Process manager interface
 */
export interface IAgentProcessManager {
  spawn(config: AgentSpawnConfig): Promise<AgentProcess>;
  kill(agentId: string, signal?: string): Promise<void>;
  pause(agentId: string): Promise<void>;
  resume(agentId: string): Promise<void>;
  resize(agentId: string, cols: number, rows: number): void;
  write(agentId: string, data: string): void;
  getProcess(agentId: string): AgentProcess | undefined;
  listProcesses(): AgentProcess[];
  getResourceUsage(agentId: string): ResourceUsage | undefined;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;      // Check interval in seconds
  timeout: number;       // Timeout for health check
  retries: number;       // Number of retries before marking unhealthy
  startPeriod: number;   // Grace period before starting checks
}

/**
 * Agent health status
 */
export interface AgentHealthStatus {
  healthy: boolean;
  lastCheck: number;
  checks: HealthCheck[];
  failureCount: number;
}

/**
 * Individual health check result
 */
export interface HealthCheck {
  timestamp: number;
  type: 'ping' | 'resource' | 'responsiveness';
  success: boolean;
  duration: number;      // Check duration in ms
  details?: any;
}