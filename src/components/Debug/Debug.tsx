import React, { useEffect, useState } from "react";
import { getContract } from "sdk/configs/contracts";
import { WORLD } from "config/static/chains";
import { DEFAULT_ORACLE_KEEPER_URL } from "lib/oracleKeeperFetcher/oracleKeeperConstants";
import { OracleKeeperDebugger, DebugLevel, DebugModule } from "lib/oracleKeeperFetcher/debug/oracleKeeperDebugger";

export function Debug(): JSX.Element {
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"general" | "oracleKeeper">("general");
  const [oracleKeeperLogs, setOracleKeeperLogs] = useState<any[]>([]);
  const [oracleKeeperStatus, setOracleKeeperStatus] = useState<Record<string, string>>({});
  const [isTestingOracleKeeper, setIsTestingOracleKeeper] = useState(false);
  
  const addLog = (message: string): void => {
    setLogs((prevLogs) => [...prevLogs, message]);
  };

  useEffect(() => {
    addLog("Debug component mounted");
    
    // Check for environment variables
    addLog(`VITE_APP_DEFAULT_CHAIN_ID: ${import.meta.env.VITE_APP_DEFAULT_CHAIN_ID || "not set"}`);
    addLog(`VITE_APP_INCLUDE_WORLD_CHAIN: ${import.meta.env.VITE_APP_INCLUDE_WORLD_CHAIN || "not set"}`);
    
    // Check contract addresses
    try {
      const vaultAddress = getContract(WORLD, "Vault");
      addLog(`WORLD Vault address: ${vaultAddress}`);
    } catch (error) {
      addLog(`Error getting Vault address: ${(error as Error).message}`);
    }
    
    // Test RPC connection
    const testRPC = async (): Promise<void> => {
      try {
        addLog("Testing RPC connection to World chain...");
        const response = await fetch("https://rpc.world-chain.org", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_chainId",
            params: [],
            id: 1
          })
        });
        const data = await response.json();
        addLog(`RPC Response: ${JSON.stringify(data)}`);
      } catch (error) {
        addLog(`RPC Error: ${(error as Error).message}`);
      }
    };

    void testRPC();
    
    // Add Oracle Keeper URL to logs
    addLog(`Oracle Keeper URL: ${DEFAULT_ORACLE_KEEPER_URL}`);
  }, []);
  
  // Run Oracle Keeper diagnostics
  const runOracleKeeperDiagnostics = async () => {
    setIsTestingOracleKeeper(true);
    setOracleKeeperLogs([]);
    setOracleKeeperStatus({});
    
    try {
      // Using a variable name other than 'debugger' as it's a reserved word in JavaScript
      const oracleDebugger = new OracleKeeperDebugger(DEFAULT_ORACLE_KEEPER_URL, false);
      
      // Health check
      setOracleKeeperStatus(prev => ({ ...prev, healthCheck: "running" }));
      const healthResult = await oracleDebugger.testHealthCheck();
      setOracleKeeperStatus(prev => ({ ...prev, healthCheck: healthResult ? "success" : "failure" }));
      setOracleKeeperLogs(oracleDebugger.getLogs());
      
      // Cache test
      setOracleKeeperStatus(prev => ({ ...prev, cache: "running" }));
      const cacheResult = oracleDebugger.testCache();
      setOracleKeeperStatus(prev => ({ ...prev, cache: cacheResult ? "success" : "failure" }));
      setOracleKeeperLogs(oracleDebugger.getLogs());
      
      // Fetch test
      setOracleKeeperStatus(prev => ({ ...prev, fetch: "running" }));
      const fetchResult = await oracleDebugger.testFetchWithRetry();
      setOracleKeeperStatus(prev => ({ ...prev, fetch: fetchResult ? "success" : "failure" }));
      setOracleKeeperLogs(oracleDebugger.getLogs());
      
      // Keeper test
      setOracleKeeperStatus(prev => ({ ...prev, keeper: "running" }));
      const keeperResult = await oracleDebugger.testRobustOracleKeeper();
      setOracleKeeperStatus(prev => ({ ...prev, keeper: keeperResult ? "success" : "failure" }));
      setOracleKeeperLogs(oracleDebugger.getLogs());
      
      // Fallback test
      setOracleKeeperStatus(prev => ({ ...prev, fallback: "running" }));
      const fallbackResult = await oracleDebugger.testFallbackBehavior();
      setOracleKeeperStatus(prev => ({ ...prev, fallback: fallbackResult ? "success" : "failure" }));
      setOracleKeeperLogs(oracleDebugger.getLogs());
      
    } catch (error) {
      console.error("Error running Oracle Keeper diagnostics:", error);
    } finally {
      setIsTestingOracleKeeper(false);
    }
  };

  // Style constants
  const styles = {
    container: {
      background: "#111",
      color: "#eee",
      fontFamily: "monospace",
      padding: "20px",
      minHeight: "100vh"
    },
    tabs: {
      display: "flex",
      borderBottom: "1px solid #333",
      marginBottom: "20px"
    },
    tab: {
      padding: "10px 20px",
      cursor: "pointer",
      backgroundColor: "#222",
      marginRight: "5px",
      borderTopLeftRadius: "5px",
      borderTopRightRadius: "5px"
    },
    activeTab: {
      backgroundColor: "#333",
      borderBottom: "2px solid #0066cc"
    },
    logContainer: {
      border: "1px solid #333",
      padding: "10px",
      marginTop: "20px",
      maxHeight: "500px",
      overflowY: "auto" as "auto" // Type assertion to fix TypeScript error
    },
    button: {
      backgroundColor: "#0066cc",
      color: "white",
      border: "none",
      padding: "10px 15px",
      borderRadius: "4px",
      cursor: "pointer",
      marginRight: "10px",
      marginBottom: "10px"
    },
    testGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "15px",
      marginBottom: "20px"
    },
    testCard: (status: string) => ({
      padding: "15px",
      borderRadius: "8px",
      backgroundColor: 
        status === "success" ? "#1a3a1a" :
        status === "failure" ? "#3a1a1a" :
        status === "running" ? "#3a3a1a" :
        "#2a2a2a",
      border: "1px solid",
      borderColor:
        status === "success" ? "#2a5a2a" :
        status === "failure" ? "#5a2a2a" :
        status === "running" ? "#5a5a2a" :
        "#3a3a3a"
    }),
    logEntry: (level: string) => ({
      padding: "5px 0",
      borderBottom: "1px solid #222",
      color: 
        level === "ERROR" ? "#ff6666" :
        level === "WARNING" ? "#ffcc66" :
        "#eee"
    }),
  };
  
  return (
    <div className="Debug" style={styles.container}>
      <h1>GMX Debug Information</h1>
      
      {/* Tab Navigation */}
      <div style={styles.tabs}>
        <div 
          style={{
            ...styles.tab,
            ...(activeTab === "general" ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab("general")}
        >
          General Info
        </div>
        <div 
          style={{
            ...styles.tab,
            ...(activeTab === "oracleKeeper" ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab("oracleKeeper")}
        >
          Oracle Keeper
        </div>
      </div>
      
      {/* General Debug Tab */}
      {activeTab === "general" && (
        <div>
          <h2>System Information</h2>
          <div style={styles.logContainer}>
            {logs.map((log, index) => (
              <div key={index} style={{ marginBottom: "5px" }}>{log}</div>
            ))}
          </div>
        </div>
      )}
      
      {/* Oracle Keeper Debug Tab */}
      {activeTab === "oracleKeeper" && (
        <div>
          <h2>Oracle Keeper Diagnostics</h2>
          <button 
            style={styles.button}
            onClick={runOracleKeeperDiagnostics}
            disabled={isTestingOracleKeeper}
          >
            {isTestingOracleKeeper ? "Running Tests..." : "Run Diagnostics"}
          </button>
          
          {/* Test Status Cards */}
          <div style={styles.testGrid}>
            <div style={styles.testCard(oracleKeeperStatus.healthCheck || "idle")}>
              <h3>Health Check</h3>
              <p>Verifies the Oracle Keeper is responsive</p>
              <div>
                {oracleKeeperStatus.healthCheck === "success" && "✓ Success"}
                {oracleKeeperStatus.healthCheck === "failure" && "✗ Failed"}
                {oracleKeeperStatus.healthCheck === "running" && "⟳ Running..."}
                {!oracleKeeperStatus.healthCheck && "Not run yet"}
              </div>
            </div>
            
            <div style={styles.testCard(oracleKeeperStatus.cache || "idle")}>
              <h3>Cache System</h3>
              <p>Tests the caching mechanism</p>
              <div>
                {oracleKeeperStatus.cache === "success" && "✓ Success"}
                {oracleKeeperStatus.cache === "failure" && "✗ Failed"}
                {oracleKeeperStatus.cache === "running" && "⟳ Running..."}
                {!oracleKeeperStatus.cache && "Not run yet"}
              </div>
            </div>
            
            <div style={styles.testCard(oracleKeeperStatus.fetch || "idle")}>
              <h3>Fetch API</h3>
              <p>Tests network fetching with retries</p>
              <div>
                {oracleKeeperStatus.fetch === "success" && "✓ Success"}
                {oracleKeeperStatus.fetch === "failure" && "✗ Failed"}
                {oracleKeeperStatus.fetch === "running" && "⟳ Running..."}
                {!oracleKeeperStatus.fetch && "Not run yet"}
              </div>
            </div>
            
            <div style={styles.testCard(oracleKeeperStatus.keeper || "idle")}>
              <h3>Robust Oracle Keeper</h3>
              <p>Tests the core Oracle Keeper component</p>
              <div>
                {oracleKeeperStatus.keeper === "success" && "✓ Success"}
                {oracleKeeperStatus.keeper === "failure" && "✗ Failed"}
                {oracleKeeperStatus.keeper === "running" && "⟳ Running..."}
                {!oracleKeeperStatus.keeper && "Not run yet"}
              </div>
            </div>
            
            <div style={styles.testCard(oracleKeeperStatus.fallback || "idle")}>
              <h3>Fallback Behavior</h3>
              <p>Tests fallback mechanisms</p>
              <div>
                {oracleKeeperStatus.fallback === "success" && "✓ Success"}
                {oracleKeeperStatus.fallback === "failure" && "✗ Failed"}
                {oracleKeeperStatus.fallback === "running" && "⟳ Running..."}
                {!oracleKeeperStatus.fallback && "Not run yet"}
              </div>
            </div>
          </div>
          
          {/* Log Output */}
          <h3>Diagnostic Logs ({oracleKeeperLogs.length})</h3>
          <div style={{
            ...styles.logContainer,
            overflowY: "auto" as "auto" // Type assertion to fix TypeScript error
          }}>
            {oracleKeeperLogs.length === 0 ? (
              <div>No logs yet. Run diagnostics to see output.</div>
            ) : (
              oracleKeeperLogs.map((log, index) => (
                <div key={index} style={styles.logEntry(log.level)}>
                  <span style={{ color: "#999" }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span> <span style={{ color: "#66ccff" }}>[{log.module}]</span> <span style={{ fontWeight: "bold" }}>[{log.level}]</span> {log.message}
                  {log.data && (
                    <div style={{ marginLeft: "20px", fontSize: "12px", color: "#aaa" }}>
                      {typeof log.data === "object" ? 
                        JSON.stringify(log.data, null, 2) : 
                        String(log.data)
                      }
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Debug;
