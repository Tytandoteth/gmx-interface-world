import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

// Import config and chains
import { getContract } from "sdk/configs/contracts";
import { WORLD } from "config/static/chains";

// Import wallet and contract utilities
import { switchNetwork } from "lib/wallets";
import { hasV1Contracts, getV1Contracts } from "config/worldChainContracts";

// Import Oracle Keeper utilities
import { fetchDirectPrices, checkOracleKeeperHealth } from "lib/oraclePrices/worldChainPriceFeed";
import { DEFAULT_ORACLE_KEEPER_URL } from "lib/oracleKeeperFetcher/oracleKeeperConstants";

// Define the QuikNode RPC URL as a constant
const WORLD_QUIKNODE_RPC = "https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/";

/**
 * World Chain Diagnostics Debug Component
 * 
 * A diagnostic tool to test World Chain integration with GMX interface including:
 * - RPC connectivity
 * - Contract address validation
 * - Oracle Keeper integration
 * - Network switching functionality
 */
export function Debug(): JSX.Element {
  // State for tabs and logs
  const [activeTab, setActiveTab] = useState<"general" | "diagnostics">("diagnostics");
  const [logs, setLogs] = useState<string[]>([]);
  
  // State for diagnostics
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [contractAddresses, setContractAddresses] = useState<Record<string, string>>({});
  const [networkStatus, setNetworkStatus] = useState<string>("");
  const [oracleStatus, setOracleStatus] = useState<{ isHealthy: boolean; details: any } | null>(null);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number> | null>(null);
  
  // Helper for logging
  const addLog = (message: string): void => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Run initial diagnostics on load
  useEffect(() => {
    addLog("Debug component initialized");
    addLog(`RPC URL: ${WORLD_QUIKNODE_RPC}`);
    addLog(`Oracle Keeper URL: ${DEFAULT_ORACLE_KEEPER_URL}`);
    
    // Load contract addresses
    if (hasV1Contracts(WORLD)) {
      const contracts = getV1Contracts(WORLD);
      setContractAddresses(contracts);
      addLog(`Loaded ${Object.keys(contracts).length} contract addresses for World Chain`);
    } else {
      addLog("No V1 contracts found for World Chain");
    }
    
    // Test RPC connection
    void testRpcConnection();
  }, []);
  
  // Test RPC connection to World Chain
  const testRpcConnection = async (): Promise<void> => {
    try {
      addLog("Testing RPC connection to World Chain...");
      setIsLoading(true);
      
      const response = await fetch(WORLD_QUIKNODE_RPC, {
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
      
      if (data.result) {
        const chainId = parseInt(data.result, 16);
        addLog(`RPC Connection Successful! Chain ID: ${chainId} (${data.result})`);
        setNetworkStatus(`Connected to World Chain (ID: ${chainId})`);
      } else if (data.error) {
        addLog(`RPC Error: ${data.error.message || JSON.stringify(data.error)}`);
        setNetworkStatus(`Error: ${data.error.message || "Failed to connect"}`);
      }
    } catch (error) {
      addLog(`RPC Connection Failed: ${(error as Error).message}`);
      setNetworkStatus(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test contract address validation
  const testContractAddresses = async (): Promise<void> => {
    addLog("Validating contract addresses...");
    setIsLoading(true);
    
    try {
      if (!contractAddresses || Object.keys(contractAddresses).length === 0) {
        addLog("No contract addresses to validate");
        return;
      }
      
      let validCount = 0;
      let invalidCount = 0;
      
      Object.entries(contractAddresses).forEach(([name, address]) => {
        try {
          const checksummedAddress = ethers.getAddress(address);
          const isValid = checksummedAddress === address;
          
          if (isValid) {
            validCount++;
            addLog(`✅ ${name}: ${address} - Valid checksum`);
          } else {
            invalidCount++;
            addLog(`❌ ${name}: ${address} - Invalid checksum (should be ${checksummedAddress})`);
          }
        } catch (error) {
          invalidCount++;
          addLog(`❌ ${name}: ${address} - Invalid address format`);
        }
      });
      
      addLog(`Validation complete: ${validCount} valid, ${invalidCount} invalid addresses`);
    } catch (error) {
      addLog(`Error validating addresses: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test Oracle Keeper
  const testOracleKeeper = async (): Promise<void> => {
    addLog("Testing Oracle Keeper integration...");
    setIsLoading(true);
    setOracleStatus(null);
    setTokenPrices(null);
    
    try {
      // Check health
      addLog("Checking Oracle Keeper health...");
      const health = await checkOracleKeeperHealth();
      setOracleStatus(health);
      
      addLog(`Oracle Keeper Health: ${health.isHealthy ? "✅ Healthy" : "❌ Unhealthy"}`);
      
      // Get prices
      addLog("Fetching prices from Oracle Keeper...");
      const pricesResponse = await fetchDirectPrices();
      
      if (pricesResponse.prices) {
        setTokenPrices(pricesResponse.prices);
        
        addLog(`Received prices for ${Object.keys(pricesResponse.prices).length} tokens:`);
        Object.entries(pricesResponse.prices).forEach(([token, price]) => {
          addLog(`${token}: $${typeof price === "number" ? price.toFixed(2) : price}`);
        });
        
        addLog(`Source: ${pricesResponse.source || "Unknown"}`);
        addLog(`Last Updated: ${pricesResponse.lastUpdated || "Unknown"}`);
      } else {
        addLog("❌ No price data received");
      }
    } catch (error) {
      addLog(`❌ Oracle Keeper Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test network switching
  const testNetworkSwitching = async (): Promise<void> => {
    addLog("Testing network switching to World Chain...");
    setIsLoading(true);
    
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not detected. Please install MetaMask and refresh.");
      }
      
      addLog("Requesting network switch...");
      await switchNetwork(WORLD, true);
      
      addLog("✅ Successfully switched to World Chain");
    } catch (error) {
      addLog(`❌ Network Switch Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Styles for the component
  const styles = {
    container: {
      padding: "20px",
      fontFamily: "monospace",
      maxWidth: "1200px",
      margin: "0 auto",
      backgroundColor: "#f5f5f5",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
    header: {
      marginBottom: "20px",
      borderBottom: "1px solid #ddd",
      paddingBottom: "10px",
    },
    title: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#333",
      marginBottom: "5px",
    },
    subtitle: {
      fontSize: "16px",
      color: "#666",
      marginBottom: "15px",
    },
    tabs: {
      display: "flex",
      marginBottom: "20px",
      borderBottom: "1px solid #ddd",
      paddingBottom: "10px",
    },
    tab: {
      padding: "10px 15px",
      marginRight: "10px",
      cursor: "pointer",
      backgroundColor: "#f0f0f0",
      borderRadius: "5px 5px 0 0",
      userSelect: "none" as const,
    },
    activeTab: {
      backgroundColor: "#007bff",
      color: "white",
    },
    section: {
      marginBottom: "20px",
    },
    sectionTitle: {
      marginBottom: "10px",
      fontWeight: "bold",
      fontSize: "18px",
      color: "#333",
    },
    logContainer: {
      height: "300px",
      overflowY: "auto" as const,
      padding: "10px",
      backgroundColor: "#1e1e1e",
      color: "#f0f0f0",
      borderRadius: "5px",
      marginBottom: "15px",
      fontFamily: "monospace",
      fontSize: "14px",
    },
    button: {
      backgroundColor: "#007bff",
      color: "white",
      border: "none",
      borderRadius: "5px",
      padding: "10px 15px",
      cursor: "pointer",
      marginRight: "10px",
      marginBottom: "10px",
      fontSize: "14px",
      fontWeight: "bold",
      transition: "background-color 0.2s",
    },
    disabledButton: {
      opacity: 0.6,
      cursor: "not-allowed",
    },
    testResults: {
      backgroundColor: "#f8f9fa",
      padding: "10px",
      borderRadius: "5px",
      marginTop: "15px",
      border: "1px solid #ddd",
    },
    success: { color: "#28a745" },
    error: { color: "#dc3545" },
    pending: { color: "#ffc107" },
    infoCard: {
      padding: "15px",
      backgroundColor: "#f8f9fa",
      borderRadius: "5px",
      marginBottom: "20px",
      border: "1px solid #ddd",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "15px",
      marginBottom: "20px",
    },
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>GMX World Chain Diagnostics</div>
        <div style={styles.subtitle}>Test the integration between GMX interface and World Chain</div>
      </div>
      
      <div style={styles.tabs}>
        <div 
          style={{ ...styles.tab, ...(activeTab === "general" ? styles.activeTab : {}) }} 
          onClick={() => setActiveTab("general")}
        >
          Activity Log
        </div>
        <div 
          style={{ ...styles.tab, ...(activeTab === "diagnostics" ? styles.activeTab : {}) }} 
          onClick={() => setActiveTab("diagnostics")}
        >
          Diagnostics Tools
        </div>
      </div>
      
      {activeTab === "general" && (
        <div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Activity Logs</div>
            <div style={styles.logContainer}>
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>
          
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Network Status</div>
            <div style={styles.infoCard}>
              <p>{networkStatus || "Not tested yet"}</p>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === "diagnostics" && (
        <div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Diagnostics Tools</div>
            <div>
              <button 
                style={{ 
                  ...styles.button, 
                  ...(isLoading ? styles.disabledButton : {}) 
                }} 
                onClick={() => void testRpcConnection()} 
                disabled={isLoading}
              >
                Test RPC Connection
              </button>
              
              <button 
                style={{ 
                  ...styles.button, 
                  ...(isLoading ? styles.disabledButton : {}) 
                }} 
                onClick={() => void testContractAddresses()} 
                disabled={isLoading}
              >
                Validate Contract Addresses
              </button>
              
              <button 
                style={{ 
                  ...styles.button, 
                  ...(isLoading ? styles.disabledButton : {}) 
                }} 
                onClick={() => void testOracleKeeper()} 
                disabled={isLoading}
              >
                Test Oracle Keeper
              </button>
              
              <button 
                style={{ 
                  ...styles.button, 
                  ...(isLoading ? styles.disabledButton : {}) 
                }} 
                onClick={() => void testNetworkSwitching()} 
                disabled={isLoading}
              >
                Test Network Switching
              </button>
            </div>
          </div>
          
          {isLoading && (
            <div style={styles.section}>
              <p style={styles.pending}>⏳ Testing in progress...</p>
            </div>
          )}
          
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Contract Addresses</div>
            <div style={styles.infoCard}>
              {Object.keys(contractAddresses).length > 0 ? (
                <ul>
                  {Object.entries(contractAddresses).map(([name, address]) => (
                    <li key={name}>
                      <strong>{name}:</strong> {address}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No contract addresses loaded</p>
              )}
            </div>
          </div>
          
          <div style={styles.grid}>
            {oracleStatus && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Oracle Keeper Status</div>
                <div style={styles.testResults}>
                  <p>
                    <strong>Health:</strong> 
                    <span style={oracleStatus.isHealthy ? styles.success : styles.error}>
                      {oracleStatus.isHealthy ? "✅ Healthy" : "❌ Unhealthy"}
                    </span>
                  </p>
                  {oracleStatus.details && (
                    <pre style={{ maxHeight: "200px", overflow: "auto", fontSize: "12px" }}>
                      {JSON.stringify(oracleStatus.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
            
            {tokenPrices && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Token Prices</div>
                <div style={styles.testResults}>
                  <ul>
                    {Object.entries(tokenPrices).map(([token, price]) => (
                      <li key={token}>
                        <strong>{token}:</strong> ${typeof price === "number" ? price.toFixed(2) : price}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Debug;
