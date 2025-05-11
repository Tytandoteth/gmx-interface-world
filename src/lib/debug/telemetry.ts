/**
 * Telemetry utilities for error tracking and performance monitoring
 * Can be integrated with external services in production environments
 */

import { createDebugLogger } from './logger';

const logger = createDebugLogger('Telemetry', { enabledInProduction: true });

interface ErrorContext {
  module?: string;
  functionName?: string;
  [key: string]: unknown;
}

interface PerformanceMetric {
  operation: string;
  durationMs: number;
  timestamp: number;
  metadata: Record<string, unknown>;
}

class TelemetryService {
  private errors: Array<{ error: Error; context: ErrorContext; timestamp: number }> = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private isEnabled: boolean = true;
  private maxStoredEvents: number = 100;

  /**
   * Report an error to the telemetry service
   * @param error The error that occurred
   * @param context Additional context about the error
   */
  reportError(error: Error, context: ErrorContext = {}): void {
    if (!this.isEnabled) return;

    // Add to local storage for debugging
    this.errors.push({
      error,
      context,
      timestamp: Date.now(),
    });

    // Trim if we have too many errors
    if (this.errors.length > this.maxStoredEvents) {
      this.errors.shift();
    }

    // Log locally
    logger.error(`Error in ${context.module || 'unknown'}: ${error.message}`, {
      ...context,
      stack: error.stack,
    });

    // In production, this would send to a service like Sentry
    if (process.env.NODE_ENV === 'production') {
      // Implement external service integration
      // e.g., Sentry.captureException(error, { extra: context });
    }
  }

  /**
   * Track performance of an operation
   * @param operation Name of the operation
   * @param durationMs Duration in milliseconds
   * @param metadata Additional metadata about the operation
   */
  trackPerformance(
    operation: string,
    durationMs: number,
    metadata: Record<string, unknown> = {}
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      operation,
      durationMs,
      timestamp: Date.now(),
      metadata,
    };

    // Store locally for analysis
    this.performanceMetrics.push(metric);

    // Trim if we have too many metrics
    if (this.performanceMetrics.length > this.maxStoredEvents) {
      this.performanceMetrics.shift();
    }

    // Log locally
    logger.info(`Performance: ${operation} took ${durationMs}ms`, metadata);

    // In production, send to analytics/monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Implement external service integration
    }
  }

  /**
   * Start timing an operation and return a function to stop and record
   * @param operation Name of the operation to time
   * @param metadata Additional metadata about the operation
   * @returns Function to stop timing and record performance
   */
  startTiming(
    operation: string,
    metadata: Record<string, unknown> = {}
  ): () => void {
    const startTime = performance.now();
    
    return (): void => {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      this.trackPerformance(operation, durationMs, metadata);
    };
  }

  /**
   * Get all recorded errors
   * @returns Array of recorded errors
   */
  getErrors(): Array<{ error: Error; context: ErrorContext; timestamp: number }> {
    return [...this.errors];
  }

  /**
   * Get all recorded performance metrics
   * @returns Array of performance metrics
   */
  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  /**
   * Clear all recorded telemetry data
   */
  clearAll(): void {
    this.errors = [];
    this.performanceMetrics = [];
  }

  /**
   * Enable or disable telemetry collection
   * @param isEnabled Whether telemetry should be enabled
   */
  setEnabled(isEnabled: boolean): void {
    this.isEnabled = isEnabled;
    logger.info(`Telemetry ${isEnabled ? 'enabled' : 'disabled'}`);
  }
}

/**
 * Singleton instance of TelemetryService for use throughout the application
 */
export const telemetry = new TelemetryService();

/**
 * Decorator function to automatically track performance of a method
 * @param target The class prototype
 * @param propertyKey The method name
 * @param descriptor The property descriptor
 * @returns Modified property descriptor
 */
export function trackPerformance(
  target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = function(...args: unknown[]): unknown {
    const className = this.constructor.name;
    const stopTiming = telemetry.startTiming(`${className}.${propertyKey}`, {
      className,
      methodName: propertyKey,
    });

    try {
      const result = originalMethod.apply(this, args);

      // Handle promises
      if (result instanceof Promise) {
        return result.finally(() => {
          stopTiming();
        });
      }

      stopTiming();
      return result;
    } catch (error) {
      // Report error and re-throw
      if (error instanceof Error) {
        telemetry.reportError(error, {
          module: className,
          functionName: propertyKey,
        });
      }
      throw error;
    }
  };

  return descriptor;
}

/**
 * Decorator function to automatically report errors from a method
 * @param target The class prototype
 * @param propertyKey The method name
 * @param descriptor The property descriptor
 * @returns Modified property descriptor
 */
export function reportErrors(
  target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = function(...args: unknown[]): unknown {
    const className = this.constructor.name;

    try {
      const result = originalMethod.apply(this, args);

      // Handle promises
      if (result instanceof Promise) {
        return result.catch((error: unknown) => {
          if (error instanceof Error) {
            telemetry.reportError(error, {
              module: className,
              functionName: propertyKey,
            });
          }
          throw error;
        });
      }

      return result;
    } catch (error) {
      // Report error and re-throw
      if (error instanceof Error) {
        telemetry.reportError(error, {
          module: className,
          functionName: propertyKey,
        });
      }
      throw error;
    }
  };

  return descriptor;
}
