import React, { useEffect, useState } from "react";
import { getContract } from "sdk/configs/contracts";
import { WORLD } from "config/static/chains";

export function Debug(): JSX.Element {
  const [logs, setLogs] = useState<string[]>([]);
  
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
  }, []);

  return (
    <div className="Debug" style={{ 
      background: "#111", 
      color: "#eee", 
      fontFamily: "monospace", 
      padding: "20px",
      minHeight: "100vh" 
    }}>
      <h1>GMX Debug Information</h1>
      <div style={{ border: "1px solid #333", padding: "10px", marginTop: "20px" }}>
        {logs.map((log, index) => (
          <div key={index} style={{ marginBottom: "5px" }}>{log}</div>
        ))}
      </div>
    </div>
  );
}

export default Debug;
