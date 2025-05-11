/**
 * Health Check Utilities
 * Provides monitoring for application services and external dependencies
 */

import { createDebugLogger } from './logger';
import { telemetry } from './telemetry';
import { CircuitBreaker } from './circuitBreaker';

const logger = createDebugLogger('HealthCheck');
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  services: Record<string, ServiceStatus>;
  details?: Record<string, unknown>;
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTimeMs?: number;
  lastChecked: number;
  details?: Record<string, unknown>;
}

// Circuit breaker to prevent repeated failures from affecting the application
const oracleKeeperCircuitBreaker = new CircuitBreaker({
  maxFailures: 3,
  resetTimeoutMs: 60000,
  name: 'OracleKeeper'
});

/**
 * Check the health of the Oracle Keeper service
 * @returns Promise resolving to the service status
 */
export async function checkOracleKeeperHealth(): Promise<ServiceStatus> {
  const startTime = performance.now();
  const serviceStatus: ServiceStatus = {
    name: 'OracleKeeper',
    status: 'down',
    lastChecked: Date.now()
  };

  try {
    // Use circuit breaker to prevent repeated failures
    const response = await oracleKeeperCircuitBreaker.execute(
      async () => {
        const response = await fetch('https://oracle-keeper.kevin8396.workers.dev/health', { 
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT)
        });
        
        if (!response.ok) {
          throw new Error(`Health check failed with status: ${response.status}`);
        }
        
        return response;
      },
      async () => {
        throw new Error('Circuit breaker is open, service considered down');
      }
    );
    
    const endTime = performance.now();
    serviceStatus.responseTimeMs = Math.round(endTime - startTime);
    
    // Try to parse JSON response
    try {
      const data = await response.json();
      serviceStatus.status = 'up';
      serviceStatus.details = data;
    } catch (error) {
      // Response was OK but not valid JSON
      serviceStatus.status = 'degraded';
      serviceStatus.details = { 
        error: 'Invalid JSON response',
        status: response.status,
        statusText: response.statusText
      };
    }
  } catch (error) {
    const endTime = performance.now();
    serviceStatus.responseTimeMs = Math.round(endTime - startTime);
    serviceStatus.status = 'down';
    serviceStatus.details = { 
      error: error instanceof Error ? error.message : String(error)
    };
    
    logger.error(`Oracle Keeper health check failed: ${String(error)}`);
  }
  
  return serviceStatus;
}

/**
 * Check the health of all application services
 * @returns Promise resolving to the overall health status
 */
export async function checkAppHealth(): Promise<HealthStatus> {
  const startTime = performance.now();
  
  logger.info('Starting application health check');
  
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: Date.now(),
    services: {}
  };

  try {
    // Check Oracle Keeper
    const oracleKeeperStatus = await checkOracleKeeperHealth();
    healthStatus.services.oracleKeeper = oracleKeeperStatus;
    
    // Add more service checks here as needed
    
    // Determine overall status based on service statuses
    const hasDownServices = Object.values(healthStatus.services).some(
      service => service.status === 'down'
    );
    
    const hasDegradedServices = Object.values(healthStatus.services).some(
      service => service.status === 'degraded'
    );
    
    if (hasDownServices) {
      healthStatus.status = 'unhealthy';
    } else if (hasDegradedServices) {
      healthStatus.status = 'degraded';
    }
    
    const endTime = performance.now();
    const totalDuration = Math.round(endTime - startTime);
    
    // Track performance
    telemetry.trackPerformance('healthCheck', totalDuration, {
      status: healthStatus.status,
      serviceCount: Object.keys(healthStatus.services).length
    });
    
    logger.info(`Health check completed: ${healthStatus.status}`, healthStatus);
    
    return healthStatus;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Health check failed: ${errorMessage}`, error);
    
    healthStatus.status = 'unhealthy';
    healthStatus.details = { error: errorMessage };
    
    telemetry.reportError(error instanceof Error ? error : new Error(errorMessage), { 
      module: 'HealthCheck', 
      function: 'checkAppHealth' 
    });
    
    return healthStatus;
  }
}

/**
 * Start a periodic health check process
 * @param intervalMs Milliseconds between checks
 * @param callback Function to call with health status
 * @returns Function to stop the periodic checks
 */
export function startPeriodicHealthChecks(
  intervalMs: number = 60000,
  callback?: (status: HealthStatus) => void
): () => void {
  logger.info(`Starting periodic health checks every ${intervalMs}ms`);
  
  const intervalId = window.setInterval(async () => {
    try {
      const status = await checkAppHealth();
      if (callback) {
        callback(status);
      }
    } catch (error) {
      logger.error('Periodic health check failed', error);
    }
  }, intervalMs);
  
  return () => {
    window.clearInterval(intervalId);
    logger.info('Periodic health checks stopped');
  };
}
