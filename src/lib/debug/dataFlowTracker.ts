/**
 * Data Flow Tracker
 * A utility to track and visualize data flow through critical application paths
 * Helps with debugging complex data transformations and identifying issues in the data pipeline
 */

export interface DataFlowEvent {
  timestamp: number;
  module: string;
  action: string;
  data: unknown;
}

/**
 * DataFlowTracker provides methods to track data flow through the application
 * and analyze the history of data transformations
 */
class DataFlowTracker {
  private events: DataFlowEvent[] = [];
  private isEnabled: boolean = true;
  private maxEvents: number = 1000; // Prevent memory leaks by limiting event count
  
  /**
   * Track a data flow event
   * @param module The module or component where the event occurred
   * @param action The action or transformation being performed
   * @param data The data being processed or transformed
   */
  track(module: string, action: string, data: unknown): void {
    if (!this.isEnabled) return;
    
    const event: DataFlowEvent = {
      timestamp: Date.now(),
      module,
      action,
      data
    };
    
    this.events.push(event);
    
    // Keep event count within limit
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Log to console for real-time debugging
    console.log(`[DataFlow] ${module} > ${action}`, data);
  }
  
  /**
   * Get all tracked events
   * @returns A copy of all tracked events
   */
  getEvents(): DataFlowEvent[] {
    return [...this.events];
  }
  
  /**
   * Get events for a specific module
   * @param module The module to filter events for
   * @returns Events related to the specified module
   */
  getEventsByModule(module: string): DataFlowEvent[] {
    return this.events.filter(event => event.module === module);
  }
  
  /**
   * Enable or disable data flow tracking
   * @param isEnabled Whether tracking should be enabled
   */
  setEnabled(isEnabled: boolean): void {
    this.isEnabled = isEnabled;
  }
  
  /**
   * Clear all tracked events
   */
  clear(): void {
    this.events = [];
  }
  
  /**
   * Export events as JSON string
   * @returns JSON string of all events
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

/**
 * Singleton instance of DataFlowTracker for use throughout the application
 */
export const dataFlowTracker = new DataFlowTracker();
