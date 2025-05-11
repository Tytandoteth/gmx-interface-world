import React, { useState, useEffect, useCallback } from 'react';
import { WorldChainProvider, useWorldChain } from 'context/WorldChainContext/WorldChainProvider';
import { createDebugLogger } from 'lib/debug/logger';
import { dataFlowTracker } from 'lib/debug/dataFlowTracker';
import { 
  simulateNetworkFailure, 
  simulateDelayedResponse, 
  simulateMalformedResponse, 
  simulateEmptyResponse 
} from 'lib/debug/testUtils';

const logger = createDebugLogger('ComponentTester');

interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Reusable button component with consistent styling
 */
const Button: React.FC<ButtonProps> = ({ onClick, disabled = false, style = {}, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{ 
      padding: '8px 16px', 
      border: 'none',
      borderRadius: '4px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }}
  >
    {children}
  </button>
);

/**
 * Debug display for WorldChain context state
 */
const WorldChainDebugDisplay: React.FC = () => {
  const worldChain = useWorldChain();
  
  // Track data flow for debugging
  useEffect(() => {
    dataFlowTracker.track('WorldChainDebugDisplay', 'state-update', {
      isWorldChain: worldChain.isWorldChain,
      isDevMode: worldChain.isDevMode,
      mockDataAvailable: worldChain.mockDataAvailable,
      prices: worldChain.oracleData.prices,
      isLoading: worldChain.oracleData.isLoading,
      hasError: !!worldChain.oracleData.error,
      lastUpdated: worldChain.oracleData.lastUpdated,
    });
  }, [
    worldChain.isWorldChain,
    worldChain.isDevMode,
    worldChain.mockDataAvailable,
    worldChain.oracleData.prices,
    worldChain.oracleData.isLoading,
    worldChain.oracleData.error,
    worldChain.oracleData.lastUpdated,
  ]);

  const handleRefreshClick = useCallback((): void => {
    worldChain.refreshPrices().catch((err: Error) => {
      logger.error('Manual refresh failed', err);
    });
  }, [worldChain]);
  
  return (
    <div className="debug-display" style={{ 
      margin: '10px', 
      padding: '10px', 
      border: '1px solid #ccc', 
      borderRadius: '4px',
      backgroundColor: '#f5f5f5'
    }}>
      <h3>WorldChain State</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <strong>isWorldChain:</strong> {worldChain.isWorldChain ? 'true' : 'false'}
        </div>
        <div>
          <strong>isDevMode:</strong> {worldChain.isDevMode ? 'true' : 'false'}
        </div>
        <div>
          <strong>mockDataAvailable:</strong> {worldChain.mockDataAvailable ? 'true' : 'false'}
        </div>
        <div>
          <strong>Loading:</strong> {worldChain.oracleData.isLoading ? 'true' : 'false'}
        </div>
        <div>
          <strong>Error:</strong> {worldChain.oracleData.error ? worldChain.oracleData.error.message : 'None'}
        </div>
        <div>
          <strong>Last Updated:</strong> {worldChain.oracleData.lastUpdated 
            ? new Date(worldChain.oracleData.lastUpdated).toLocaleTimeString() 
            : 'Never'}
        </div>
        <div>
          <strong>Prices:</strong>
          <pre style={{ 
            maxHeight: '200px', 
            overflow: 'auto', 
            backgroundColor: '#282c34', 
            color: '#abb2bf',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            {JSON.stringify(worldChain.oracleData.prices, null, 2)}
          </pre>
        </div>
      </div>
      
      <div style={{ marginTop: '16px' }}>
        <Button 
          onClick={handleRefreshClick}
          style={{ backgroundColor: '#4CAF50', color: 'white' }}
        >
          Refresh Prices
        </Button>
      </div>
    </div>
  );
};

/**
 * Test harness for WorldChainProvider with error simulation capabilities
 */
export const WorldChainProviderTester: React.FC = () => {
  const [testMode, setTestMode] = useState<string | null>(null);
  
  // Clear test mode after simulation
  useEffect(() => {
    if (testMode) {
      const timer = setTimeout(() => {
        setTestMode(null);
      }, 10000); // Reset after 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [testMode]);
  
  // Handle different test simulations
  const runSimulation = useCallback(async (mode: string): Promise<void> => {
    setTestMode(mode);
    logger.info(`Running simulation: ${mode}`);
    
    try {
      switch (mode) {
        case 'network-failure':
          await simulateNetworkFailure(async () => {
            // Force a refresh to trigger the network failure
            const worldChainElement = document.querySelector('.debug-display');
            const refreshButton = worldChainElement?.querySelector('button');
            if (refreshButton) refreshButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
          });
          break;
          
        case 'delayed-response':
          await simulateDelayedResponse(async () => {
            // Force a refresh to trigger the delayed response
            const worldChainElement = document.querySelector('.debug-display');
            const refreshButton = worldChainElement?.querySelector('button');
            if (refreshButton) refreshButton.click();
            await new Promise(resolve => setTimeout(resolve, 6000));
          }, 5000);
          break;
          
        case 'malformed-response':
          await simulateMalformedResponse(async () => {
            // Force a refresh to trigger the malformed response
            const worldChainElement = document.querySelector('.debug-display');
            const refreshButton = worldChainElement?.querySelector('button');
            if (refreshButton) refreshButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
          });
          break;
          
        case 'empty-response':
          await simulateEmptyResponse(async () => {
            // Force a refresh to trigger the empty response
            const worldChainElement = document.querySelector('.debug-display');
            const refreshButton = worldChainElement?.querySelector('button');
            if (refreshButton) refreshButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
          });
          break;
          
        default:
          logger.warn(`Unknown simulation mode: ${mode}`);
      }
    } catch (error) {
      logger.error(`Error during simulation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);
  
  // Generate test controls
  const renderTestControls = useCallback((): JSX.Element => {
    const tests = [
      { id: 'network-failure', label: 'Simulate Network Failure' },
      { id: 'delayed-response', label: 'Simulate Delayed Response' },
      { id: 'malformed-response', label: 'Simulate Malformed Response' },
      { id: 'empty-response', label: 'Simulate Empty Response' }
    ];
    
    return (
      <div style={{ margin: '16px 0' }}>
        <h3>Test Controls</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {tests.map(test => (
            <Button
              key={test.id}
              onClick={() => runSimulation(test.id)}
              disabled={testMode !== null}
              style={{ 
                backgroundColor: testMode === test.id ? '#ffcc00' : '#2196F3',
                color: testMode === test.id ? '#000' : '#fff',
              }}
            >
              {test.label}
            </Button>
          ))}
        </div>
        
        {testMode && (
          <div style={{ 
            marginTop: '8px', 
            padding: '8px', 
            backgroundColor: '#fff3cd', 
            color: '#856404',
            borderRadius: '4px'
          }}>
            Running simulation: <strong>{testMode}</strong> (automatically resets in 10 seconds)
          </div>
        )}
      </div>
    );
  }, [testMode, runSimulation]);
  
  // Handle clearing cache and local storage
  const handleClearStorage = useCallback((): void => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
      logger.info('Cleared local and session storage');
      window.alert('Storage cleared successfully!');
    } catch (error) {
      logger.error('Failed to clear storage', error);
      window.alert(`Failed to clear storage: ${String(error)}`);
    }
  }, []);
  
  // Handle clearing data flow tracker
  const handleClearDataFlow = useCallback((): void => {
    dataFlowTracker.clear();
    logger.info('Cleared data flow tracker');
    window.alert('Data flow tracker cleared successfully!');
  }, []);
  
  // Handle downloading data flow log
  const handleDownloadDataFlow = useCallback((): void => {
    try {
      const events = dataFlowTracker.exportEvents();
      const blob = new Blob([events], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-flow-log-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      logger.info('Downloaded data flow log');
    } catch (error) {
      logger.error('Failed to download data flow log', error);
      window.alert(`Failed to download log: ${String(error)}`);
    }
  }, []);
  
  return (
    <div className="debug-container" style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px' }}>WorldChainProvider Test Harness</h2>
      
      <div style={{ 
        padding: '12px', 
        backgroundColor: '#e1f5fe', 
        borderRadius: '4px',
        marginBottom: '16px'
      }}>
        <p>This test harness allows you to debug the WorldChainProvider component in isolation.</p>
        <p>Use the controls below to test different error scenarios and observe how the component responds.</p>
      </div>
      
      {renderTestControls()}
      
      <div style={{ 
        margin: '16px 0', 
        display: 'flex', 
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <Button
          onClick={handleClearStorage}
          style={{ backgroundColor: '#f44336', color: 'white' }}
        >
          Clear Cache & Storage
        </Button>
        
        <Button
          onClick={handleClearDataFlow}
          style={{ backgroundColor: '#ff9800', color: 'white' }}
        >
          Clear Data Flow Log
        </Button>
        
        <Button
          onClick={handleDownloadDataFlow}
          style={{ backgroundColor: '#9c27b0', color: 'white' }}
        >
          Download Data Flow Log
        </Button>
      </div>
      
      <WorldChainProvider>
        <WorldChainDebugDisplay />
      </WorldChainProvider>
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>Debug output is available in the browser console (press F12 to view).</p>
      </div>
    </div>
  );
};

export default WorldChainProviderTester;
