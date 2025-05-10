/**
 * Special metrics handling for World Chain development mode
 * This module intercepts metrics events and provides mock implementations
 * to prevent errors when running in World Chain development mode
 */

import { WORLD, isChainInDevelopment } from "sdk/configs/chains";
import { isWorldChain } from "./worldChainDevMode";
import {
  METRIC_EVENT_DISPATCH_NAME,
  METRIC_COUNTER_DISPATCH_NAME,
  METRIC_TIMING_DISPATCH_NAME
} from "lib/metrics/emitMetricEvent";

/**
 * Initialize metrics handling for World Chain development mode
 * This intercepts metric events and provides mock implementations
 */
export function initWorldChainMetrics(): void {
  if (typeof window === 'undefined') return;
  
  // Store original methods for cases when we're not in World Chain dev mode
  const originalAddEventListener = window.addEventListener.bind(window);
  const originalDispatchEvent = window.dispatchEvent.bind(window);
  
  // Create a type-safe wrapper for addEventListener that handles our custom events
  type MetricEventType = typeof METRIC_EVENT_DISPATCH_NAME | typeof METRIC_COUNTER_DISPATCH_NAME | typeof METRIC_TIMING_DISPATCH_NAME;
  
  // Create a map of our custom event names for type safety
  const customMetricEvents = {
    [METRIC_EVENT_DISPATCH_NAME]: true,
    [METRIC_COUNTER_DISPATCH_NAME]: true,
    [METRIC_TIMING_DISPATCH_NAME]: true
  };

  // Type guard for our custom metric events
  function isMetricEvent(type: string): type is MetricEventType {
    return type in customMetricEvents;
  }
  
  // Create a type-safe wrapper for addEventListener
  const addEventListenerWrapper = <K extends keyof WindowEventMap>(
    type: K | string,
    listener: K extends keyof WindowEventMap 
      ? (this: Window, ev: WindowEventMap[K]) => any 
      : EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void => {
    // For metric-related events, provide special handling in World Chain dev mode
    if (isMetricEvent(type)) {
      // Create a wrapper for the event listener
      const wrappedListener = function(this: Window, event: Event): void {
        // Check if we're in World Chain dev mode when the event fires
        if (
          (window as any).worldChainDevModeEnabled ||
          ((window as any).currentChainId === WORLD && isChainInDevelopment(WORLD))
        ) {
          // For World Chain in dev mode, just log the event but don't process it further
          console.debug(`[World Chain Dev] Intercepted metric event: ${type}`, (event as CustomEvent<any>).detail);
          // Event handled
          return;
        }
        
        // For other chains, process normally with the original listener
        if (typeof listener === 'function') {
          (listener as EventListener).call(this, event);
        } else {
          (listener as EventListenerObject).handleEvent.call(listener, event);
        }
      };
      
      // Register the wrapped listener
      originalAddEventListener(type, wrappedListener as EventListener, options);
    } else {
      // For standard events, use the original method directly
      originalAddEventListener(type, listener as EventListenerOrEventListenerObject, options);
    }
  };
  
  // Override window.addEventListener with our wrapper
  window.addEventListener = addEventListenerWrapper as typeof window.addEventListener;
  
  // Create a type-safe wrapper for dispatchEvent
  const dispatchEventWrapper = (event: Event): boolean => {
    // For metric-related events, check if we're in World Chain dev mode
    if (isMetricEvent(event.type)) {
      const chainId = (window as any).currentChainId;
      
      // Special handling for World Chain dev mode
      if (isWorldChain(chainId) && isChainInDevelopment(chainId)) {
        // Store the dev mode flag for future checks
        (window as any).worldChainDevModeEnabled = true;
        
        // Log the event but don't actually send it
        console.debug(`[World Chain Dev] Suppressed metric event: ${event.type}`, (event as CustomEvent<any>).detail);
        
        // Return true to indicate success (though we didn't actually dispatch)
        return true;
      }
    }
    
    // For other events or chains, use the original method
    return originalDispatchEvent(event);
  };
  
  // Override window.dispatchEvent with our wrapper
  window.dispatchEvent = dispatchEventWrapper as typeof window.dispatchEvent;
  
  console.log("World Chain metrics handling initialized");
}
