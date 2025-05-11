import React, { useState, useEffect, useCallback } from 'react';
import WorldChainProviderTester from './ComponentTester';
import { createDebugLogger } from '../lib/debug/logger';
import { telemetry } from '../lib/debug/telemetry';
import { checkAppHealth, startPeriodicHealthChecks, HealthStatus } from '../lib/debug/healthCheck';
import { dataFlowTracker } from '../lib/debug/dataFlowTracker';

const logger = createDebugLogger('DebugDashboard');

interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const Tab: React.FC<TabProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '10px 20px',
      backgroundColor: isActive ? '#2196F3' : '#f5f5f5',
      color: isActive ? 'white' : 'black',
      border: 'none',
      borderRadius: '4px 4px 0 0',
      cursor: 'pointer',
      fontWeight: isActive ? 'bold' : 'normal',
      marginRight: '2px'
    }}
  >
    {label}
  </button>
);

interface AppHealthDisplayProps {
  health: HealthStatus | null;
  onRefresh: () => void;
}

const AppHealthDisplay: React.FC<AppHealthDisplayProps> = ({ health, onRefresh }) => {
  if (!health) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading health data...</p>
        <button 
          onClick={onRefresh}
          style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Check Health
        </button>
      </div>
    );
  }

  const statusColors = {
    healthy: '#4CAF50',
    degraded: '#FF9800',
    unhealthy: '#F44336'
  };

  const serviceStatusColors = {
    up: '#4CAF50',
    degraded: '#FF9800',
    down: '#F44336'
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Application Health</h3>
        <button 
          onClick={onRefresh}
          style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Refresh
        </button>
      </div>

      <div style={{ 
        padding: '15px', 
        backgroundColor: statusColors[health.status], 
        color: 'white',
        borderRadius: '4px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0' }}>Overall Status: {health.status.toUpperCase()}</h3>
        <p style={{ margin: '5px 0 0 0' }}>
          Last checked: {new Date(health.timestamp).toLocaleString()}
        </p>
      </div>

      <div>
        <h4>Services</h4>
        {Object.entries(health.services).map(([key, service]) => (
          <div key={key} style={{ 
            padding: '10px', 
            backgroundColor: '#f5f5f5', 
            marginBottom: '10px',
            borderRadius: '4px',
            borderLeft: `5px solid ${serviceStatusColors[service.status]}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h5 style={{ margin: '0' }}>{service.name}</h5>
              <span style={{ 
                fontWeight: 'bold',
                color: serviceStatusColors[service.status]
              }}>
                {service.status.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '14px', marginTop: '5px' }}>
              <div>Response time: {service.responseTimeMs ?? 'N/A'} ms</div>
              <div>Last checked: {new Date(service.lastChecked).toLocaleTimeString()}</div>
            </div>
            {service.details && (
              <div style={{ marginTop: '10px' }}>
                <details>
                  <summary>Details</summary>
                  <pre style={{ 
                    backgroundColor: '#282c34', 
                    color: '#abb2bf',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(service.details, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface TelemetryDisplayProps {
  onClear: () => void;
}

const TelemetryDisplay: React.FC<TelemetryDisplayProps> = ({ onClear }) => {
  const [metrics, setMetrics] = useState(telemetry.getPerformanceMetrics());
  const [errors, setErrors] = useState(telemetry.getErrors());

  const refreshData = useCallback(() => {
    setMetrics(telemetry.getPerformanceMetrics());
    setErrors(telemetry.getErrors());
  }, []);

  // Refresh data periodically
  useEffect(() => {
    const intervalId = setInterval(refreshData, 5000);
    return () => clearInterval(intervalId);
  }, [refreshData]);

  const handleClear = (): void => {
    telemetry.clearAll();
    refreshData();
    onClear();
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Telemetry Data</h3>
        <div>
          <button 
            onClick={refreshData}
            style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}
          >
            Refresh
          </button>
          <button 
            onClick={handleClear}
            style={{ padding: '8px 16px', backgroundColor: '#F44336', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Clear All
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h4>Errors ({errors.length})</h4>
        {errors.length === 0 ? (
          <p>No errors recorded</p>
        ) : (
          <div style={{ 
            maxHeight: '300px', 
            overflow: 'auto',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            {errors.map((error, index) => (
              <div key={index} style={{ 
                padding: '10px', 
                backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff',
                borderBottom: '1px solid #ddd'
              }}>
                <div style={{ fontWeight: 'bold', color: '#F44336' }}>
                  {error.error.message}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                  {new Date(error.timestamp).toLocaleString()} - 
                  Module: {error.context.module || 'Unknown'} - 
                  Function: {error.context.functionName || 'Unknown'}
                </div>
                <details>
                  <summary>Stack Trace</summary>
                  <pre style={{ 
                    backgroundColor: '#282c34', 
                    color: '#abb2bf',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {error.error.stack || 'No stack trace available'}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4>Performance Metrics ({metrics.length})</h4>
        {metrics.length === 0 ? (
          <p>No performance metrics recorded</p>
        ) : (
          <div style={{ 
            maxHeight: '300px', 
            overflow: 'auto',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            {metrics.map((metric, index) => (
              <div key={index} style={{ 
                padding: '10px', 
                backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff',
                borderBottom: '1px solid #ddd',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{metric.operation}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {new Date(metric.timestamp).toLocaleString()}
                  </div>
                </div>
                <div style={{ 
                  fontWeight: 'bold',
                  color: metric.durationMs > 1000 ? '#F44336' : metric.durationMs > 500 ? '#FF9800' : '#4CAF50'
                }}>
                  {metric.durationMs} ms
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface DataFlowDisplayProps {
  onClear: () => void;
  onDownload: () => void;
}

const DataFlowDisplay: React.FC<DataFlowDisplayProps> = ({ onClear, onDownload }) => {
  const [events, setEvents] = useState(dataFlowTracker.getEvents());
  const [filter, setFilter] = useState('');

  const refreshData = useCallback(() => {
    setEvents(dataFlowTracker.getEvents());
  }, []);

  // Refresh data periodically
  useEffect(() => {
    const intervalId = setInterval(refreshData, 5000);
    return () => clearInterval(intervalId);
  }, [refreshData]);

  const filteredEvents = filter
    ? events.filter(event => 
        event.module.toLowerCase().includes(filter.toLowerCase()) ||
        event.action.toLowerCase().includes(filter.toLowerCase())
      )
    : events;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Data Flow Events ({filteredEvents.length})</h3>
        <div>
          <button 
            onClick={refreshData}
            style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}
          >
            Refresh
          </button>
          <button 
            onClick={onClear}
            style={{ padding: '8px 16px', backgroundColor: '#F44336', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}
          >
            Clear
          </button>
          <button 
            onClick={onDownload}
            style={{ padding: '8px 16px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Download
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Filter by module or action..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ 
            padding: '8px',
            width: '100%',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}
        />
      </div>

      {filteredEvents.length === 0 ? (
        <p>No data flow events recorded</p>
      ) : (
        <div style={{ 
          maxHeight: '500px', 
          overflow: 'auto',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          {filteredEvents.map((event, index) => (
            <div key={index} style={{ 
              padding: '10px', 
              backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff',
              borderBottom: '1px solid #ddd'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 'bold' }}>
                  {event.module} &gt; {event.action}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <details>
                <summary>Data</summary>
                <pre style={{ 
                  backgroundColor: '#282c34', 
                  color: '#abb2bf',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Debug Dashboard Component
 * Provides a comprehensive UI for debugging and monitoring the application
 */
export const DebugDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('component-tester');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  
  // Check health on mount
  useEffect(() => {
    const checkHealth = async (): Promise<void> => {
      try {
        const healthStatus = await checkAppHealth();
        setHealth(healthStatus);
      } catch (error) {
        logger.error('Failed to check health', error);
      }
    };
    
    checkHealth();
    
    // Start periodic health checks
    const stopChecks = startPeriodicHealthChecks(60000, (status) => {
      setHealth(status);
    });
    
    return () => {
      stopChecks();
    };
  }, []);
  
  // Handler for refreshing health status
  const handleRefreshHealth = useCallback(async (): Promise<void> => {
    try {
      const healthStatus = await checkAppHealth();
      setHealth(healthStatus);
    } catch (error) {
      logger.error('Failed to refresh health', error);
    }
  }, []);
  
  // Handler for clearing data flow
  const handleClearDataFlow = useCallback((): void => {
    dataFlowTracker.clear();
    logger.info('Data flow cleared');
  }, []);
  
  // Handler for downloading data flow
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
    }
  }, []);
  
  // Handler for clearing telemetry
  const handleClearTelemetry = useCallback((): void => {
    telemetry.clearAll();
    logger.info('Telemetry cleared');
  }, []);
  
  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h1 style={{ borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>Oracle Keeper Debugging Dashboard</h1>
      
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '4px',
        marginBottom: '20px',
        borderLeft: '5px solid #2196F3'
      }}>
        <p style={{ margin: 0 }}>
          Use this dashboard to debug and monitor the Oracle Keeper integration. 
          Select different tabs to access various debugging tools.
        </p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
          <Tab 
            label="Component Tester" 
            isActive={activeTab === 'component-tester'} 
            onClick={() => setActiveTab('component-tester')}
          />
          <Tab 
            label="Health Status" 
            isActive={activeTab === 'health'} 
            onClick={() => setActiveTab('health')}
          />
          <Tab 
            label="Telemetry" 
            isActive={activeTab === 'telemetry'} 
            onClick={() => setActiveTab('telemetry')}
          />
          <Tab 
            label="Data Flow" 
            isActive={activeTab === 'data-flow'} 
            onClick={() => setActiveTab('data-flow')}
          />
        </div>
      </div>
      
      <div style={{ backgroundColor: '#fff', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' }}>
        {activeTab === 'component-tester' && <WorldChainProviderTester />}
        {activeTab === 'health' && <AppHealthDisplay health={health} onRefresh={handleRefreshHealth} />}
        {activeTab === 'telemetry' && <TelemetryDisplay onClear={handleClearTelemetry} />}
        {activeTab === 'data-flow' && (
          <DataFlowDisplay onClear={handleClearDataFlow} onDownload={handleDownloadDataFlow} />
        )}
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
        <p>Debug Dashboard v1.0 - Created for GMX Interface World Chain</p>
      </div>
    </div>
  );
};

export default DebugDashboard;
