/**
 * Circuit Breaker Pattern implementation
 * Prevents cascading failures by stopping repeated calls to failing services
 */

import { createDebugLogger } from './logger';

const logger = createDebugLogger('CircuitBreaker');

/**
 * Circuit states
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Failure threshold exceeded, all requests go to fallback
 * - HALF_OPEN: Testing if service is recovered after timeout
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  maxFailures: number;
  resetTimeoutMs: number;
  name: string;
}

/**
 * Circuit Breaker implementation
 * Tracks failures and prevents calls to unreliable services
 */
export class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: CircuitState = 'CLOSED';
  private readonly maxFailures: number;
  private readonly resetTimeoutMs: number;
  private readonly name: string;
  
  /**
   * Create a new circuit breaker
   * @param options Configuration options
   */
  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.maxFailures = options.maxFailures ?? 3;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
    this.name = options.name ?? 'Default';
    
    logger.info(`Created circuit breaker: ${this.name}`, {
      maxFailures: this.maxFailures,
      resetTimeoutMs: this.resetTimeoutMs
    });
  }
  
  /**
   * Execute a function with circuit breaker protection
   * @param fn The function to execute
   * @param fallback Fallback function to call when circuit is open
   * @returns Promise resolving to the result of either fn or fallback
   */
  async execute<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    // If circuit is open, check if it's time to try again
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceLastFailure > this.resetTimeoutMs) {
        logger.info(`Circuit ${this.name} trying half-open state after ${timeSinceLastFailure}ms`);
        this.state = 'HALF_OPEN';
      } else {
        logger.debug(`Circuit ${this.name} is OPEN, using fallback`);
        return fallback();
      }
    }
    
    // Execute the function
    try {
      const result = await fn();
      
      // If we were testing the service in HALF_OPEN state, reset the circuit
      if (this.state === 'HALF_OPEN') {
        logger.info(`Circuit ${this.name} reset to CLOSED after successful call`);
        this.reset();
      }
      
      return result;
    } catch (error) {
      // Record the failure
      this.recordFailure(error);
      
      // Use fallback
      return fallback();
    }
  }
  
  /**
   * Get the current state of the circuit
   * @returns Current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get the number of consecutive failures
   * @returns Failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }
  
  /**
   * Record a failure and potentially open the circuit
   * @param error The error that occurred
   */
  private recordFailure(error: unknown): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    logger.warn(`Circuit ${this.name} recorded failure (${this.failureCount}/${this.maxFailures})`, 
      error instanceof Error ? error.message : String(error));
    
    if (this.failureCount >= this.maxFailures) {
      this.state = 'OPEN';
      logger.error(`Circuit ${this.name} OPENED after ${this.failureCount} failures`);
    }
  }
  
  /**
   * Reset the circuit to closed state
   */
  private reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  /**
   * Manually force the circuit into open state
   * Useful for testing or when an external system indicates failure
   */
  forceOpen(): void {
    this.state = 'OPEN';
    this.lastFailureTime = Date.now();
    this.failureCount = this.maxFailures;
    logger.info(`Circuit ${this.name} manually forced OPEN`);
  }
  
  /**
   * Manually reset the circuit to closed state
   * Useful for testing or administrative interventions
   */
  forceReset(): void {
    this.reset();
    logger.info(`Circuit ${this.name} manually reset to CLOSED`);
  }
}
