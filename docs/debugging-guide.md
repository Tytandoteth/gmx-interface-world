# GMX Interface World Chain Debugging Guide

This document provides a comprehensive guide to debugging the Oracle Keeper integration and other aspects of the GMX Interface for World Chain.

## Debugging Tools Overview

We've implemented a suite of debugging tools to help identify, reproduce, and fix issues:

1. **Debug Logger**: Enhanced logging with module namespacing
2. **Data Flow Tracker**: Track and visualize data transformations
3. **Circuit Breaker**: Prevent cascading failures
4. **Type Guards**: Runtime type validation
5. **Error Simulation**: Tools to simulate various failure modes
6. **Health Monitoring**: Monitor external services
7. **Telemetry**: Track performance and errors
8. **Component Tester**: Isolated environment for testing components

## How to Access the Debug Dashboard

The debug dashboard provides a central location to access all debugging tools:

1. Add this route to your application (in `src/App/App.tsx` or routing configuration):

```tsx
import DebugDashboard from 'src/debug';

// In your routes configuration
{
  path: '/debug',
  element: <DebugDashboard />
}
```

2. Navigate to `/debug` in your application to access the dashboard

## Using the Debug Logger

The debug logger provides consistent, structured logging across the application:

```typescript
import { createDebugLogger } from 'lib/debug/logger';

// Create a module-specific logger
const logger = createDebugLogger('MyComponent');

// Use the logger in your code
logger.info('Component initialized', { props });
logger.warn('Potential issue detected', { details });
logger.error('Something went wrong', error);
logger.debug('Detailed information for debugging', { state });

// Measure function performance
logger.timeStart('operation');
await someExpensiveOperation();
logger.timeEnd('operation');
```

## Tracking Data Flow

Data flow tracking helps visualize how data moves through the application:

```typescript
import { dataFlowTracker } from 'lib/debug/dataFlowTracker';

// Track data transformations
dataFlowTracker.track('OracleKeeper', 'fetchPrices.start', { url, params });
// ... perform fetch
dataFlowTracker.track('OracleKeeper', 'fetchPrices.response', response);
// ... transform data
dataFlowTracker.track('OracleKeeper', 'fetchPrices.processed', processedData);
```

View and analyze the tracked events in the Data Flow tab of the Debug Dashboard.

## Simulating Error Conditions

Test how your code handles failures:

```typescript
import { 
  simulateNetworkFailure, 
  simulateDelayedResponse,
  simulateMalformedResponse,
  simulateEmptyResponse 
} from 'lib/debug/testUtils';

// Simulate a network failure
await simulateNetworkFailure(async () => {
  // This code will encounter network errors
  await fetchData();
});

// Simulate a slow response
await simulateDelayedResponse(async () => {
  // This code will experience delays
  await fetchData();
}, 5000); // 5 second delay
```

## Using Circuit Breakers

Prevent cascading failures with circuit breakers:

```typescript
import { CircuitBreaker } from 'lib/debug/circuitBreaker';

// Create a circuit breaker
const oracleCircuitBreaker = new CircuitBreaker({
  maxFailures: 3,
  resetTimeoutMs: 30000,
  name: 'OracleKeeper'
});

// Use the circuit breaker to protect function calls
const result = await oracleCircuitBreaker.execute(
  async () => { 
    // Main function that might fail
    return await fetchDataFromOracle();
  },
  async () => {
    // Fallback function when circuit is open
    return fallbackData;
  }
);
```

## Type Guards and Validation

Prevent runtime type errors:

```typescript
import { 
  isPriceData, 
  isObject,
  safeNumberConvert,
  safeObjectAccess
} from 'lib/debug/typeGuards';

// Validate data structure
if (!isPriceData(response)) {
  throw new Error('Invalid price data format');
}

// Safely access nested properties
const price = safeObjectAccess(data, 'tokens.BTC.price', 0);

// Safely convert values
const amount = safeNumberConvert(inputValue, 0);
```

## Health Monitoring

Monitor application health:

```typescript
import { checkAppHealth, checkOracleKeeperHealth } from 'lib/debug/healthCheck';

// Check overall application health
const healthStatus = await checkAppHealth();
console.log(`App status: ${healthStatus.status}`);

// Check specific service
const oracleStatus = await checkOracleKeeperHealth();
console.log(`Oracle Keeper status: ${oracleStatus.status}`);
```

## Performance Monitoring

Track performance metrics:

```typescript
import { telemetry } from 'lib/debug/telemetry';

// Track operation performance
const startTime = performance.now();
await someOperation();
const duration = performance.now() - startTime;
telemetry.trackPerformance('someOperation', duration, { context });

// Alternative: use the startTiming helper
const endTiming = telemetry.startTiming('someOperation', { context });
await someOperation();
endTiming(); // This will record the time automatically

// Report errors
try {
  await riskyOperation();
} catch (error) {
  telemetry.reportError(error, { module: 'MyComponent', functionName: 'processData' });
}
```

## Component Testing

The Component Tester provides an isolated environment to test components:

1. Navigate to the Component Tester tab in the Debug Dashboard
2. Use the controls to simulate various error conditions
3. Observe how the component behaves under different scenarios
4. Clear cache and telemetry data as needed

## Debugging Workflow

When debugging issues with the Oracle Keeper or other components:

1. **Identify**: Use the logs and dashboard to identify the issue
2. **Reproduce**: Use the simulation tools to consistently reproduce the problem
3. **Isolate**: Use the component tester to isolate the issue to a specific component
4. **Fix**: Implement a fix with proper error handling and type checking
5. **Validate**: Test the fix using the simulation tools to ensure it resolves the issue
6. **Monitor**: Use health checks and telemetry to ensure the fix is working in production

## Best Practices

1. **Add logging at critical points**: Entry/exit of important functions, data transformations
2. **Use defensive programming**: Add null checks, type validation, and error handling
3. **Test edge cases**: Use simulation tools to test how code handles failures
4. **Monitor performance**: Use telemetry to identify slow operations
5. **Watch for patterns**: Look for common failure modes and address them systematically

## Oracle Keeper Specific Debugging

When debugging Oracle Keeper integration issues:

1. **Check Health**: Use `checkOracleKeeperHealth()` to verify the service is responsive
2. **Validate Response Format**: Use type guards to validate API responses
3. **Monitor Retries**: Watch for retry patterns that might indicate intermittent issues
4. **Check Cache**: Verify if cached data is being used when appropriate
5. **Test Fallbacks**: Ensure fallback mechanisms work when the service is unavailable

## Adding New Debugging Features

To extend the debugging framework:

1. Add new utilities to the appropriate files in `src/lib/debug/`
2. Update the debug dashboard in `src/debug/index.tsx` if needed
3. Add documentation in this guide

## Common Issues and Solutions

| Issue | Possible Causes | Debugging Steps |
|-------|----------------|----------------|
| "Cannot read property of undefined" | Missing null checks | Use the data flow tracker to identify where the data becomes null/undefined |
| "Network error" | Service offline, network issues | Use health checks to verify service status |
| "Invalid JSON" | Malformed API response | Use simulation tools to test error handling |
| "Timeout" | Slow service response | Check telemetry for performance trends |
| "Circuit open" | Too many failures | Check error logs to find the root cause |
