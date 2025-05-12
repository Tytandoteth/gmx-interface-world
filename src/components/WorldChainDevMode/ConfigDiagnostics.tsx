import React, { useEffect, useState } from "react";
import styled from "styled-components";

import { RPC_PROVIDERS } from "config/chains";
import { WORLD } from "config/static/chains";
import { isWorldChainConfigInitialized } from "lib/worldchain/initConfig";
import { getWorldChainConfig, shouldUseProductionMode } from "lib/worldchain/worldChainProduction";
import { getOracleKeeperUrl } from "sdk/configs/oracleKeeper";

const DiagnosticsContainer = styled.div`
  background-color: #2a2e3e;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
  color: white;
  font-size: 0.85rem;
`;

const ConfigSection = styled.div`
  margin-bottom: 0.75rem;
`;

const SectionTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #b7b7ce;
`;

const StatusItem = styled.div<{ success?: boolean }>`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  
  span:first-child {
    color: #b7b7ce;
  }
  
  span:last-child {
    font-weight: 500;
    color: ${(props) => (props.success ? "#22c761" : props.success === false ? "#fa3c58" : "#f2c75c")};
  }
`;

interface ApiTestResult {
  url: string;
  status: "ok" | "error" | "pending";
  latency?: number;
}

const ConfigDiagnostics: React.FC = () => {
  const [rpcTestResults, setRpcTestResults] = useState<ApiTestResult[]>([]);
  const [oracleKeeperTestResult, setOracleKeeperTestResult] = useState<ApiTestResult | null>(null);
  
  useEffect(() => {
    const testRpcEndpoints = async () => {
      const results: ApiTestResult[] = [];
      
      // Test all RPC endpoints for World Chain
      for (const url of RPC_PROVIDERS[WORLD]) {
        try {
          const startTime = Date.now();
          
          // Create a simple JSON-RPC request to test the endpoint
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "eth_chainId",
              params: [],
            }),
          });
          
          const latency = Date.now() - startTime;
          
          if (response.ok) {
            await response.json(); // Parse response to validate it's proper JSON
            results.push({
              url,
              status: "ok",
              latency,
            });
          } else {
            results.push({
              url,
              status: "error",
              latency,
            });
          }
        } catch (error) {
          results.push({
            url,
            status: "error",
          });
        }
      }
      
      setRpcTestResults(results);
    };
    
    const testOracleKeeper = async () => {
      const url = getOracleKeeperUrl(WORLD, 0);
      
      try {
        const startTime = Date.now();
        const response = await fetch(`${url}/health`);
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          setOracleKeeperTestResult({
            url,
            status: "ok",
            latency,
          });
        } else {
          setOracleKeeperTestResult({
            url,
            status: "error",
            latency,
          });
        }
      } catch (error) {
        setOracleKeeperTestResult({
          url,
          status: "error",
        });
      }
    };
    
    testRpcEndpoints();
    testOracleKeeper();
  }, []);
  
  const worldChainConfig = getWorldChainConfig();
  
  return (
    <DiagnosticsContainer>
      <SectionTitle>World Chain Configuration Diagnostics</SectionTitle>
      
      <ConfigSection>
        <StatusItem success={isWorldChainConfigInitialized()}>
          <span>Config Initialized:</span>
          <span>{isWorldChainConfigInitialized() ? "Yes" : "No"}</span>
        </StatusItem>
        
        <StatusItem success={!!worldChainConfig.feature_flags}>
          <span>Feature Flags:</span>
          <span>{worldChainConfig.feature_flags ? "Available" : "Missing"}</span>
        </StatusItem>
        
        <StatusItem>
          <span>Mode:</span>
          <span>{shouldUseProductionMode() ? "Production" : "Development"}</span>
        </StatusItem>
      </ConfigSection>
      
      <SectionTitle>RPC Connectivity</SectionTitle>
      <ConfigSection>
        {rpcTestResults.length === 0 && (
          <StatusItem>
            <span>Testing RPC Endpoints...</span>
            <span>Please wait</span>
          </StatusItem>
        )}
        
        {rpcTestResults.map((result, index) => (
          <StatusItem key={index} success={result.status === "ok"}>
            <span>{result.url.substring(0, 25)}...</span>
            <span>
              {result.status === "ok" 
                ? `OK (${result.latency}ms)` 
                : "Failed"}
            </span>
          </StatusItem>
        ))}
      </ConfigSection>
      
      <SectionTitle>Oracle Keeper</SectionTitle>
      <ConfigSection>
        {!oracleKeeperTestResult && (
          <StatusItem>
            <span>Testing Oracle Keeper...</span>
            <span>Please wait</span>
          </StatusItem>
        )}
        
        {oracleKeeperTestResult && (
          <>
            <StatusItem success={oracleKeeperTestResult.status === "ok"}>
              <span>Health Check:</span>
              <span>
                {oracleKeeperTestResult.status === "ok" 
                  ? `OK (${oracleKeeperTestResult.latency}ms)` 
                  : "Failed"}
              </span>
            </StatusItem>
            
            <StatusItem>
              <span>URL:</span>
              <span>{oracleKeeperTestResult.url}</span>
            </StatusItem>
          </>
        )}
      </ConfigSection>
    </DiagnosticsContainer>
  );
};

export default ConfigDiagnostics;
