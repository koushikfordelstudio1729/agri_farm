import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
  tags?: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
}

export interface CPUUsage {
  user: number;
  system: number;
  timestamp: number;
}

export interface DatabaseMetrics {
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
  queries: {
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
  };
  slowQueries: number;
  timestamp: number;
}

export interface APIMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime: number;
  };
  endpoints: Record<string, {
    count: number;
    avgResponseTime: number;
    errorRate: number;
  }>;
  timestamp: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  memory: MemoryUsage;
  cpu: CPUUsage;
  database: DatabaseMetrics;
  api: APIMetrics;
  timestamp: number;
  version: string;
  environment: string;
}

class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private timers: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private startTime: number = Date.now();
  private metricsRetentionPeriod = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    super();
    this.startPeriodicCollection();
  }

  // Timer operations
  startTimer(name: string, tags?: Record<string, string>): void {
    const key = this.createKey(name, tags);
    this.timers.set(key, performance.now());
  }

  endTimer(name: string, tags?: Record<string, string>): number {
    const key = this.createKey(name, tags);
    const startTime = this.timers.get(key);
    
    if (!startTime) {
      throw new Error(`Timer '${key}' was not started`);
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(key);
    
    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags,
    });
    
    return duration;
  }

  // Time a function execution
  timeFunction<T>(
    name: string, 
    fn: () => T, 
    tags?: Record<string, string>
  ): T {
    this.startTimer(name, tags);
    try {
      const result = fn();
      this.endTimer(name, tags);
      return result;
    } catch (error) {
      this.endTimer(name, { ...tags, error: 'true' });
      throw error;
    }
  }

  // Time an async function execution
  async timeAsyncFunction<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    this.startTimer(name, tags);
    try {
      const result = await fn();
      this.endTimer(name, tags);
      return result;
    } catch (error) {
      this.endTimer(name, { ...tags, error: 'true' });
      throw error;
    }
  }

  // Counter operations
  incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.createKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    this.recordMetric({
      name,
      value: current + value,
      unit: 'count',
      timestamp: Date.now(),
      tags,
    });
  }

  decrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.createKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, Math.max(0, current - value));
    
    this.recordMetric({
      name,
      value: Math.max(0, current - value),
      unit: 'count',
      timestamp: Date.now(),
      tags,
    });
  }

  // Gauge operations
  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.createKey(name, tags);
    this.gauges.set(key, value);
    
    this.recordMetric({
      name,
      value,
      unit: 'count',
      timestamp: Date.now(),
      tags,
    });
  }

  // Histogram operations
  recordValue(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.createKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
    
    // Keep only last 1000 values to prevent memory leaks
    if (values.length > 1000) {
      values.shift();
    }
    
    this.recordMetric({
      name,
      value,
      unit: 'count',
      timestamp: Date.now(),
      tags,
    });
  }

  // Memory monitoring
  getMemoryUsage(): MemoryUsage {
    const memUsage = process.memoryUsage();
    return {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      timestamp: Date.now(),
    };
  }

  // CPU monitoring
  getCPUUsage(): CPUUsage {
    const cpuUsage = process.cpuUsage();
    return {
      user: cpuUsage.user,
      system: cpuUsage.system,
      timestamp: Date.now(),
    };
  }

  // System uptime
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  // Record custom metric
  recordMetric(metric: PerformanceMetric): void {
    const metrics = this.metrics.get(metric.name) || [];
    metrics.push(metric);
    this.metrics.set(metric.name, metrics);
    
    // Clean old metrics
    this.cleanOldMetrics(metric.name);
    
    // Check thresholds and emit warnings
    this.checkThresholds(metric);
    
    this.emit('metric', metric);
  }

  // Get metrics
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.get(name) || [];
    }
    
    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    
    return allMetrics;
  }

  // Get metric statistics
  getMetricStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    sum: number;
    latest: number;
  } | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }
    
    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      sum,
      latest: values[values.length - 1],
    };
  }

  // Get histogram percentiles
  getPercentiles(name: string, percentiles: number[] = [50, 90, 95, 99]): Record<string, number> | null {
    const values = this.histograms.get(this.createKey(name));
    if (!values || values.length === 0) {
      return null;
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const result: Record<string, number> = {};
    
    percentiles.forEach(p => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[`p${p}`] = sorted[Math.max(0, index)];
    });
    
    return result;
  }

  // Resource monitoring
  monitorResource(name: string, fn: () => number, interval: number = 5000): void {
    const monitor = () => {
      try {
        const value = fn();
        this.setGauge(name, value);
      } catch (error) {
        this.emit('error', new Error(`Resource monitoring failed for ${name}: ${error}`));
      }
    };
    
    monitor(); // Initial measurement
    setInterval(monitor, interval);
  }

  // Database query monitoring
  measureDatabaseQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    return this.timeAsyncFunction(`db.query.${queryName}`, queryFn, {
      ...tags,
      type: 'database',
    });
  }

  // HTTP request monitoring
  measureHTTPRequest<T>(
    method: string,
    endpoint: string,
    requestFn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    return this.timeAsyncFunction(`http.request`, requestFn, {
      ...tags,
      method,
      endpoint,
      type: 'http',
    });
  }

  // Health check
  getHealthStatus(): SystemHealth {
    const memory = this.getMemoryUsage();
    const cpu = this.getCPUUsage();
    
    // Simplified health status calculation
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Memory check (if heap usage > 80%)
    if (memory.heapUsed / memory.heapTotal > 0.8) {
      status = 'warning';
    }
    
    // Memory check (if heap usage > 95%)
    if (memory.heapUsed / memory.heapTotal > 0.95) {
      status = 'critical';
    }
    
    return {
      status,
      uptime: this.getUptime(),
      memory,
      cpu,
      database: {
        connectionPool: { active: 0, idle: 0, total: 0 },
        queries: { total: 0, successful: 0, failed: 0, avgDuration: 0 },
        slowQueries: 0,
        timestamp: Date.now(),
      },
      api: {
        requests: { total: 0, successful: 0, failed: 0, avgResponseTime: 0 },
        endpoints: {},
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  // Export metrics (for monitoring systems like Prometheus)
  exportMetrics(): string {
    let output = '';
    
    for (const [name, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue;
      
      const latest = metrics[metrics.length - 1];
      const stats = this.getMetricStats(name);
      
      if (stats) {
        output += `# HELP ${name} ${name} metric\n`;
        output += `# TYPE ${name} gauge\n`;
        output += `${name}{type="latest"} ${latest.value} ${latest.timestamp}\n`;
        output += `${name}{type="avg"} ${stats.avg} ${latest.timestamp}\n`;
        output += `${name}{type="max"} ${stats.max} ${latest.timestamp}\n`;
        output += `${name}{type="min"} ${stats.min} ${latest.timestamp}\n`;
      }
    }
    
    return output;
  }

  // Reset all metrics
  reset(): void {
    this.metrics.clear();
    this.timers.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  // Private methods
  private createKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    
    return `${name}{${tagString}}`;
  }

  private cleanOldMetrics(name: string): void {
    const metrics = this.metrics.get(name);
    if (!metrics) return;
    
    const cutoff = Date.now() - this.metricsRetentionPeriod;
    const filtered = metrics.filter(m => m.timestamp > cutoff);
    
    if (filtered.length !== metrics.length) {
      this.metrics.set(name, filtered);
    }
  }

  private checkThresholds(metric: PerformanceMetric): void {
    if (!metric.threshold) return;
    
    if (metric.value >= metric.threshold.critical) {
      this.emit('threshold', {
        metric: metric.name,
        level: 'critical',
        value: metric.value,
        threshold: metric.threshold.critical,
      });
    } else if (metric.value >= metric.threshold.warning) {
      this.emit('threshold', {
        metric: metric.name,
        level: 'warning',
        value: metric.value,
        threshold: metric.threshold.warning,
      });
    }
  }

  private startPeriodicCollection(): void {
    // Collect memory and CPU metrics every 30 seconds
    setInterval(() => {
      const memory = this.getMemoryUsage();
      const cpu = this.getCPUUsage();
      
      this.recordMetric({
        name: 'system.memory.heap.used',
        value: memory.heapUsed,
        unit: 'bytes',
        timestamp: Date.now(),
        threshold: { warning: 500 * 1024 * 1024, critical: 800 * 1024 * 1024 }, // 500MB warning, 800MB critical
      });
      
      this.recordMetric({
        name: 'system.memory.heap.total',
        value: memory.heapTotal,
        unit: 'bytes',
        timestamp: Date.now(),
      });
      
      this.recordMetric({
        name: 'system.cpu.user',
        value: cpu.user,
        unit: 'ms',
        timestamp: Date.now(),
      });
      
      this.recordMetric({
        name: 'system.uptime',
        value: this.getUptime(),
        unit: 'ms',
        timestamp: Date.now(),
      });
      
    }, 30000);
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export both the class and singleton
export { PerformanceMonitor };
export default performanceMonitor;

// Utility functions
export const performanceUtils = {
  // Measure execution time
  measure: <T>(name: string, fn: () => T): T => {
    return performanceMonitor.timeFunction(name, fn);
  },
  
  // Measure async execution time
  measureAsync: <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    return performanceMonitor.timeAsyncFunction(name, fn);
  },
  
  // Create a performance decorator
  createPerformanceDecorator: (metricName: string) => {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;
      
      descriptor.value = function (...args: any[]) {
        const name = `${target.constructor.name}.${propertyName}`;
        return performanceMonitor.timeFunction(`${metricName}.${name}`, () => method.apply(this, args));
      };
    };
  },
  
  // Create async performance decorator
  createAsyncPerformanceDecorator: (metricName: string) => {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;
      
      descriptor.value = function (...args: any[]) {
        const name = `${target.constructor.name}.${propertyName}`;
        return performanceMonitor.timeAsyncFunction(`${metricName}.${name}`, () => method.apply(this, args));
      };
    };
  },
  
  // Monitor resource usage
  monitorResource: (name: string, fn: () => number, interval?: number) => {
    performanceMonitor.monitorResource(name, fn, interval);
  },
  
  // Get system health
  getHealth: () => performanceMonitor.getHealthStatus(),
  
  // Export metrics for monitoring
  exportMetrics: () => performanceMonitor.exportMetrics(),
};