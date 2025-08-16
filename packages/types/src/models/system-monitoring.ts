/**
 * System Monitoring Models
 * Classes for system metrics and resource monitoring
 */

/**
 * System resource snapshot
 */
export class SystemSnapshot {
  public readonly timestamp: Date;
  public readonly cpu: CpuMetrics;
  public readonly memory: MemoryMetrics;
  public readonly disk: DiskMetrics[];
  public readonly network: NetworkMetrics[];
  public readonly processes: ProcessMetrics;
  
  constructor(data: any) {
    this.timestamp = new Date();
    this.cpu = new CpuMetrics(data.cpu);
    this.memory = new MemoryMetrics(data.memory);
    this.disk = data.disk?.map((d: any) => new DiskMetrics(d)) || [];
    this.network = data.network?.map((n: any) => new NetworkMetrics(n)) || [];
    this.processes = new ProcessMetrics(data.processes);
  }
  
  /**
   * Check if any resource exceeds threshold
   */
  checkThresholds(thresholds: ResourceThresholds): Alert[] {
    const alerts: Alert[] = [];
    
    if (this.cpu.usage > thresholds.cpuPercent) {
      alerts.push(new Alert('cpu', 'warning', `CPU usage ${this.cpu.usage}% exceeds threshold`));
    }
    
    if (this.memory.percent > thresholds.memoryPercent) {
      alerts.push(new Alert('memory', 'warning', `Memory usage ${this.memory.percent}% exceeds threshold`));
    }
    
    for (const disk of this.disk) {
      if (disk.percent > thresholds.diskPercent) {
        alerts.push(new Alert('disk', 'warning', `Disk ${disk.mountPoint} ${disk.percent}% full`));
      }
    }
    
    return alerts;
  }
}

export class CpuMetrics {
  public usage: number;
  public cores: number;
  public loadAverage: [number, number, number];
  public temperature?: number;
  
  constructor(data: any) {
    this.usage = data.usage || 0;
    this.cores = data.cores || 1;
    this.loadAverage = data.loadAverage || [0, 0, 0];
    this.temperature = data.temperature;
  }
}

export class MemoryMetrics {
  public total: number;
  public used: number;
  public free: number;
  public available: number;
  public percent: number;
  public swap?: {
    total: number;
    used: number;
    percent: number;
  };
  
  constructor(data: any) {
    this.total = data.total || 0;
    this.used = data.used || 0;
    this.free = data.free || 0;
    this.available = data.available || 0;
    this.percent = data.percent || 0;
    this.swap = data.swap;
  }
}

export class DiskMetrics {
  public device: string;
  public mountPoint: string;
  public total: number;
  public used: number;
  public free: number;
  public percent: number;
  
  constructor(data: any) {
    this.device = data.device || '';
    this.mountPoint = data.mountPoint || '';
    this.total = data.total || 0;
    this.used = data.used || 0;
    this.free = data.free || 0;
    this.percent = data.percent || 0;
  }
}

export class NetworkMetrics {
  public interface: string;
  public bytesIn: number;
  public bytesOut: number;
  public packetsIn: number;
  public packetsOut: number;
  public errorsIn: number;
  public errorsOut: number;
  
  constructor(data: any) {
    this.interface = data.interface || '';
    this.bytesIn = data.bytesIn || 0;
    this.bytesOut = data.bytesOut || 0;
    this.packetsIn = data.packetsIn || 0;
    this.packetsOut = data.packetsOut || 0;
    this.errorsIn = data.errorsIn || 0;
    this.errorsOut = data.errorsOut || 0;
  }
}

export class ProcessMetrics {
  public total: number;
  public running: number;
  public sleeping: number;
  public stopped: number;
  public zombie: number;
  
  constructor(data: any) {
    this.total = data.total || 0;
    this.running = data.running || 0;
    this.sleeping = data.sleeping || 0;
    this.stopped = data.stopped || 0;
    this.zombie = data.zombie || 0;
  }
}

// Import Alert class - will be defined in alerts.ts
export class Alert {
  public readonly id: string;
  public readonly type: 'cpu' | 'memory' | 'disk' | 'network' | 'agent' | 'system';
  public readonly severity: 'info' | 'warning' | 'error' | 'critical';
  public readonly message: string;
  public readonly timestamp: Date;
  public acknowledged: boolean = false;
  public resolved: boolean = false;
  
  constructor(type: Alert['type'], severity: Alert['severity'], message: string) {
    this.id = generateId();
    this.type = type;
    this.severity = severity;
    this.message = message;
    this.timestamp = new Date();
  }
  
  acknowledge(_userId: string): void {
    this.acknowledged = true;
  }
  
  resolve(): void {
    this.resolved = true;
  }
}

export interface ResourceThresholds {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  networkErrorRate: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}