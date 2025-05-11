import React, { useState, useEffect } from "react";
import styled from "styled-components";

import { WORLD } from "sdk/configs/chains";
import { OracleKeeperDebugger, DebugLevel } from "./oracleKeeperDebugger";
import { DEFAULT_ORACLE_KEEPER_URL } from "../oracleKeeperConstants";
import { OracleKeeperStatus } from "./OracleKeeperStatus";

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: "Inter", sans-serif;
`;

const Header = styled.div`
  margin-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 10px;
`;

const Description = styled.p`
  color: #666;
  margin-bottom: 20px;
`;

const ControlPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
  max-width: 500px;
`;

const Button = styled.button<{ variant?: "primary" | "secondary" | "danger" }>`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: ${(props) => 
    props.variant === "primary" ? "#0066cc" : 
    props.variant === "danger" ? "#cc3300" : 
    "#666666"};
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${(props) => 
    props.variant === "primary" ? "#0055aa" : 
    props.variant === "danger" ? "#aa2200" : 
    "#555555"};
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const TestGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
`;

const TestCard = styled.div<{ status?: "success" | "failure" | "pending" | "idle" }>`
  padding: 15px;
  border-radius: 8px;
  background-color: ${(props) => 
    props.status === "success" ? "#e6f7e6" : 
    props.status === "failure" ? "#f7e6e6" : 
    props.status === "pending" ? "#f7f7e6" : 
    "#f0f0f0"};
  border: 1px solid ${(props) => 
    props.status === "success" ? "#c3e6c3" : 
    props.status === "failure" ? "#e6c3c3" : 
    props.status === "pending" ? "#e6e6c3" : 
    "#e0e0e0"};
`;

const TestTitle = styled.h3`
  font-size: 16px;
  margin-bottom: 10px;
`;

const TestDescription = styled.p`
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
`;

const TestStatus = styled.div<{ status?: "success" | "failure" | "pending" | "idle" }>`
  font-weight: 500;
  color: ${(props) => 
    props.status === "success" ? "#007700" : 
    props.status === "failure" ? "#cc0000" : 
    props.status === "pending" ? "#cc7700" : 
    "#666666"};
`;

const LogsContainer = styled.div`
  margin-top: 20px;
`;

const LogsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const LogsTitle = styled.h2`
  font-size: 18px;
`;

const LogsTable = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  max-height: 400px;
  overflow-y: auto;
`;

const LogRow = styled.div<{ level: DebugLevel }>`
  display: grid;
  grid-template-columns: 180px 80px 100px 1fr;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  background-color: ${(props) => 
    props.level === DebugLevel.ERROR ? "#fff0f0" : 
    props.level === DebugLevel.WARNING ? "#fffff0" : 
    "transparent"};
  
  &:last-child {
    border-bottom: none;
  }
`;

const NoLogsRow = styled(LogRow)`
  text-align: center;
`;

const LogHeader = styled(LogRow)`
  background-color: #f5f5f5;
  font-weight: 500;
`;

const LogCell = styled.div<{ level?: DebugLevel }>`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  color: ${(props) => 
    props.level === DebugLevel.ERROR ? "#cc0000" : 
    props.level === DebugLevel.WARNING ? "#cc7700" : 
    "inherit"};
`;

// For expanded log data display
const ExpandedLogRow = styled(LogRow)`
  display: block;
  padding: 0;
`;

const LogData = styled.pre`
  margin: 0;
  padding: 8px 12px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
  font-family: monospace;
`;

// Test definitions
const tests = [
  {
    id: "healthCheck",
    name: "Health Check",
    description: "Verifies the Oracle Keeper is responsive by calling the health endpoint.",
    run: (oracleDebugger: OracleKeeperDebugger): Promise<boolean> => oracleDebugger.testHealthCheck()
  },
  {
    id: "cache",
    name: "Cache Functionality",
    description: "Tests the caching mechanism including TTL and stale cache recovery.",
    run: (oracleDebugger: OracleKeeperDebugger): Promise<boolean> => Promise.resolve(oracleDebugger.testCache())
  },
  {
    id: "fetchWithRetry",
    name: "Fetch with Retry",
    description: "Tests the retry mechanism that helps handle transient network failures.",
    run: (oracleDebugger: OracleKeeperDebugger): Promise<boolean> => oracleDebugger.testFetchWithRetry()
  },
  {
    id: "robustOracleKeeper",
    name: "RobustOracleKeeper",
    description: "Tests the core Oracle Keeper integration, including price fetching.",
    run: (oracleDebugger: OracleKeeperDebugger): Promise<boolean> => oracleDebugger.testRobustOracleKeeper()
  },
  {
    id: "fallbackBehavior",
    name: "Fallback Behavior",
    description: "Tests the fallback mechanisms when the network or API fails.",
    run: (oracleDebugger: OracleKeeperDebugger): Promise<boolean> => oracleDebugger.testFallbackBehavior()
  }
];

type TestStatus = "idle" | "pending" | "success" | "failure";
type TestResults = Record<string, TestStatus>;

// Oracle Keeper Debug Page Component
const OracleKeeperDebugPage: React.FC = () => {
  const [url, setUrl] = useState<string>(DEFAULT_ORACLE_KEEPER_URL);
  const [oracleDebugger, setOracleDebugger] = useState<OracleKeeperDebugger | null>(null);
  const [testResults, setTestResults] = useState<TestResults>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // Initialize the debugger
    const newOracleDebugger = new OracleKeeperDebugger(url, false);
    setOracleDebugger(newOracleDebugger);
    
    // Initialize test results
    const initialResults: TestResults = {};
    tests.forEach(test => {
      initialResults[test.id] = "idle";
    });
    setTestResults(initialResults);
    
    return () => {
      // Cleanup if needed
    };
  }, [url]);

  // Toggle expanded log
  const toggleLogExpanded = (index: number): void => {
    setExpandedLogs(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Run a single test
  const runTest = async (testId: string): Promise<void> => {
    if (!oracleDebugger) return;
    
    // Find the test
    const test = tests.find(t => t.id === testId);
    if (!test) return;
    
    // Update status
    setTestResults(prev => ({ ...prev, [testId]: "pending" }));
    
    try {
      const result = await test.run(oracleDebugger);
      setTestResults(prev => ({ 
        ...prev, 
        [testId]: result ? "success" : "failure" 
      }));
      
      // Update logs
      setLogs(oracleDebugger.getLogs());
    } catch (error) {
      // Handle error without using console
      setTestResults(prev => ({ 
        ...prev, 
        [testId]: "failure" 
      }));
      
      // Still update logs to see error details
      setLogs(oracleDebugger.getLogs());
    }
  };

  // Run all tests
  const runAllTests = async (): Promise<void> => {
    if (!oracleDebugger) return;
    
    setIsRunningTests(true);
    
    // Mark all tests as pending
    const pendingResults: TestResults = {};
    tests.forEach(test => {
      pendingResults[test.id] = "pending";
    });
    setTestResults(pendingResults);
    
    try {
      // Clear previous logs
      oracleDebugger.clearLogs();
      
      // Run each test in sequence
      for (const test of tests) {
        try {
          const result = await test.run(oracleDebugger);
          setTestResults(prev => ({ 
            ...prev, 
            [test.id]: result ? "success" : "failure" 
          }));
        } catch (error) {
          setTestResults(prev => ({ ...prev, [test.id]: "failure" }));
        }
        
        // Update logs after each test
        setLogs(oracleDebugger.getLogs());
      }
    } finally {
      setIsRunningTests(false);
    }
  };

  // Reset all tests
  const resetTests = (): void => {
    if (!oracleDebugger) return;
    
    // Reset test results
    const resetResults: TestResults = {};
    tests.forEach(test => {
      resetResults[test.id] = "idle";
    });
    setTestResults(resetResults);
    
    // Clear logs
    oracleDebugger.clearLogs();
    setLogs([]);
  };

  // Initialize new debugger with updated URL
  const updateUrl = (): void => {
    const newOracleDebugger = new OracleKeeperDebugger(url, false);
    setOracleDebugger(newOracleDebugger);
    resetTests();
  };
  
  return (
    <Container>
      <Header>
        <Title>Oracle Keeper Debugger</Title>
        <Description>
          Use this tool to diagnose issues with the Oracle Keeper integration.
          Run tests individually or all at once to identify potential problems.
        </Description>
      </Header>
      
      {/* Oracle Keeper Status Monitor */}
      <OracleKeeperStatus 
        chainId={WORLD} 
        url={url}
      />
      
      <ControlPanel>
        <div>
          <label htmlFor="oracle-url">Oracle Keeper URL:</label>
          <Input 
            id="oracle-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter Oracle Keeper URL"
          />
        </div>
        
        <ButtonGroup>
          <Button variant="primary" onClick={updateUrl}>
            Update URL
          </Button>
          <Button 
            variant="primary" 
            onClick={runAllTests}
            disabled={isRunningTests}
          >
            {isRunningTests ? "Running Tests..." : "Run All Tests"}
          </Button>
          <Button 
            onClick={resetTests}
            disabled={isRunningTests}
          >
            Reset Tests
          </Button>
        </ButtonGroup>
      </ControlPanel>
      
      <TestGrid>
        {tests.map((test) => (
          <TestCard 
            key={test.id}
            status={testResults[test.id]}
          >
            <TestTitle>{test.name}</TestTitle>
            <TestDescription>{test.description}</TestDescription>
            <TestStatus status={testResults[test.id]}>
              {testResults[test.id] === "idle" && "Not Run"}
              {testResults[test.id] === "pending" && "Running..."}
              {testResults[test.id] === "success" && "Success ✓"}
              {testResults[test.id] === "failure" && "Failed ✗"}
            </TestStatus>
            <Button 
              onClick={() => runTest(test.id)} 
              disabled={testResults[test.id] === "pending" || isRunningTests}
              style={{ marginTop: "10px" }}
            >
              Run Test
            </Button>
          </TestCard>
        ))}
      </TestGrid>
      
      <LogsContainer>
        <LogsHeader>
          <LogsTitle>Debug Logs ({logs.length})</LogsTitle>
          <Button 
            variant="danger" 
            onClick={() => {
              if (oracleDebugger) {
                oracleDebugger.clearLogs();
                setLogs([]);
              }
            }}
            disabled={logs.length === 0}
          >
            Clear Logs
          </Button>
        </LogsHeader>
        
        <LogsTable>
          <LogHeader level={DebugLevel.INFO}>
            <LogCell>Timestamp</LogCell>
            <LogCell>Level</LogCell>
            <LogCell>Module</LogCell>
            <LogCell>Message</LogCell>
          </LogHeader>
          
          {logs.map((log, index) => (
            <React.Fragment key={index}>
              <LogRow 
                level={log.level}
                onClick={() => toggleLogExpanded(index)}
                style={{ cursor: "pointer" }}
              >
                <LogCell>{new Date(log.timestamp).toLocaleTimeString()}</LogCell>
                <LogCell level={log.level}>{log.level}</LogCell>
                <LogCell>{log.module}</LogCell>
                <LogCell>{log.message}</LogCell>
              </LogRow>
              
              {expandedLogs[index] && log.data && (
                <ExpandedLogRow level={DebugLevel.INFO}>
                  <LogData>
                    {typeof log.data === "object" 
                      ? JSON.stringify(log.data, null, 2) 
                      : String(log.data)
                    }
                  </LogData>
                </ExpandedLogRow>
              )}
            </React.Fragment>
          ))}
          
          {logs.length === 0 && (
            <NoLogsRow level={DebugLevel.INFO}>
              <LogCell style={{ gridColumn: "span 4", textAlign: "center" }}>
                No logs yet. Run tests to see debug information.
              </LogCell>
            </NoLogsRow>
          )}
        </LogsTable>
      </LogsContainer>
    </Container>
  );
};

export default OracleKeeperDebugPage;
