/**
 * @package agent-manager/lifecycle/monitoring
 * CPU monitoring strategy implementation
 */

import * as os from 'os';
import { MonitoringStrategy, ResourceSample } from './types';

export class CPUMonitoringStrategy implements MonitoringStrategy {
  name = 'cpu-monitor';
  enabled = true;
  interval = 1000; // 1 second

  private previousCpuUsage: NodeJS.CpuUsage | null = null;
  private previousTime: number = 0;

  async collect(): Promise<Partial<ResourceSample>> {
    const currentTime = Date.now();
    const currentCpuUsage = process.cpuUsage();
    
    let cpuPercent = 0;
    let systemPercent = 0;
    let userPercent = 0;

    if (this.previousCpuUsage && this.previousTime) {
      const timeDiff = (currentTime - this.previousTime) * 1000; // Convert to microseconds
      const userDiff = currentCpuUsage.user - this.previousCpuUsage.user;
      const systemDiff = currentCpuUsage.system - this.previousCpuUsage.system;
      
      userPercent = (userDiff / timeDiff) * 100;
      systemPercent = (systemDiff / timeDiff) * 100;
      cpuPercent = userPercent + systemPercent;
    }

    // Update previous values for next calculation
    this.previousCpuUsage = currentCpuUsage;
    this.previousTime = currentTime;

    return {
      cpu: {
        percent: Math.min(100, Math.max(0, cpuPercent)),
        system: Math.min(100, Math.max(0, systemPercent)),
        user: Math.min(100, Math.max(0, userPercent))
      }
    };
  }

  validate(sample: ResourceSample): boolean {
    return (
      sample.cpu &&
      typeof sample.cpu.percent === 'number' &&
      sample.cpu.percent >= 0 &&
      sample.cpu.percent <= 100
    );
  }

  /**
   * Get system-wide CPU information
   */
  getSystemCpuInfo() {
    const cpus = os.cpus();
    return {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
      speed: cpus[0]?.speed || 0,
      loadAverage: os.loadavg()
    };
  }

  /**
   * Calculate CPU usage over a specific time window
   */
  async measureCpuUsage(durationMs: number): Promise<number> {
    const startUsage = process.cpuUsage();
    const startTime = process.hrtime.bigint();
    
    await new Promise(resolve => setTimeout(resolve, durationMs));
    
    const endUsage = process.cpuUsage(startUsage);
    const endTime = process.hrtime.bigint();
    
    const totalTime = Number(endTime - startTime) / 1000; // Convert to microseconds
    const cpuTime = endUsage.user + endUsage.system;
    
    return Math.min(100, (cpuTime / totalTime) * 100);
  }
}