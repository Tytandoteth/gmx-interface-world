import { ethers } from 'ethers';
import React, { useState, useEffect } from 'react';
import Card from '../Common/Card';

import { WORLD } from '../../config/chains';
import { getV1WhitelistedTokens } from '../../config/worldChainTokens.v1';
import { createWorldChainProvider } from '../../lib/contracts/worldChainV1Contracts';
import { useWorldChainVault, useWorldChainRouter, useWorldChainVaultPriceFeed } from '../../lib/contracts/worldChainV1Contracts';
import { getWorldChainRpcUrl } from '../../lib/worldchain/environmentUtils';
import { checkOracleKeeperHealth } from '../../lib/oraclePrices/worldChainPriceFeed';

interface ContractStatus {
  name: string;
  address: string;
  connected: boolean;
  error: string | null;
}

interface RpcStatus {
  endpoint: string;
  connected: boolean;
  blockNumber: number | null;
  error: string | null;
}

interface OracleStatus {
  isHealthy: boolean;
  details: string | null;
  error: string | null;
}

const V1Diagnostics: React.FC = () => {
  const [contractStatuses, setContractStatuses] = useState<ContractStatus[]>([]);
  const [rpcStatus, setRpcStatus] = useState<RpcStatus>({
    endpoint: getWorldChainRpcUrl(),
    connected: false,
    blockNumber: null,
    error: null
  });
  const [oracleStatus, setOracleStatus] = useState<OracleStatus>({
    isHealthy: false,
    details: null,
    error: null
  });
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [tokenStatus, setTokenStatus] = useState<string>('');

  // Get V1 contract instances
  const { vaultFallback } = useWorldChainVault();
  const { routerFallback } = useWorldChainRouter();
  const { vaultPriceFeedFallback } = useWorldChainVaultPriceFeed();

  // Track contract addresses
  const [vaultContractAddress, setVaultContractAddress] = useState<string | null>(null);
  const [routerContractAddress, setRouterContractAddress] = useState<string | null>(null);
  const [priceFeedContractAddress, setPriceFeedContractAddress] = useState<string | null>(null);

  // Contract status
  const [vaultStatus, setVaultStatus] = useState<string>('Initializing');
  const [providerStatus, setProviderStatus] = useState<string>('Connecting...');

  // Check token data from config
  useEffect(() => {
    try {
      const tokens = getV1WhitelistedTokens(WORLD);
      if (tokens && tokens.length > 0) {
        setTokenStatus('Loaded');
        // Update supported tokens
        const symbols = tokens.map(token => token.symbol);
        setSupportedTokens(symbols);
      } else {
        setTokenStatus('No tokens found');
      }
    } catch (error) {
      setTokenStatus('Error loading token data');
    }
  }, []);

  // Verify RPC connection on mount
  useEffect(() => {
    const checkRpcConnection = async () => {
      const rpcUrl = getWorldChainRpcUrl();
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const blockNumber = await provider.getBlockNumber();
        setRpcStatus({
          endpoint: rpcUrl,
          connected: true,
          blockNumber,
          error: null
        });
      } catch (error) {
        console.warn('Error connecting to World Chain RPC:', error);
        setRpcStatus({
          endpoint: rpcUrl,
          connected: false,
          blockNumber: null,
          error: (error as Error).message
        });
      }
    };

    checkRpcConnection();
  }, []);

  // Verify contract connections on mount
  useEffect(() => {
    const checkFallbackContracts = async () => {
      try {
        // Vault
        if (vaultFallback) {
          const address = String(vaultFallback.target);
          setVaultContractAddress(address);
          setVaultStatus('Connected');
        } else {
          setVaultStatus('Not connected');
        }

        // Router
        if (routerFallback) {
          const address = String(routerFallback.target);
          setRouterContractAddress(address);
        }

        // VaultPriceFeed
        if (vaultPriceFeedFallback) {
          const address = String(vaultPriceFeedFallback.target);
          setPriceFeedContractAddress(address);
        }
      } catch (error) {
        setVaultStatus('Error checking contracts');
      }
    };

    checkFallbackContracts();
  }, [vaultFallback, routerFallback, vaultPriceFeedFallback]);

  // Check Oracle Keeper health
  useEffect(() => {
    const checkOracle = async () => {
      try {
        const healthStatus = await checkOracleKeeperHealth();
        setOracleStatus({
          isHealthy: healthStatus.isHealthy,
          details: healthStatus.details ? JSON.stringify(healthStatus.details) : null,
          error: null
        });
      } catch (error) {
        setOracleStatus({
          isHealthy: false,
          details: null,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    };

    checkOracle();
  }, []);

  return (
    <Card title="V1 Diagnostics">
      <div className="App-card-content">
        <div className="mb-2">
          <h3>World Chain V1 Integration Status</h3>
          <div className="text-success">V1 Support: Enabled</div>
        </div>

        <div className="mb-2">
          <h3>RPC Connection</h3>
          <div className={rpcStatus.connected ? "text-success" : "text-error"}>
            Status: {rpcStatus.connected ? "Connected" : "Disconnected"}
          </div>
          <div>Endpoint: {rpcStatus.endpoint}</div>
          {rpcStatus.blockNumber && <div>Block Number: {rpcStatus.blockNumber}</div>}
          {rpcStatus.error && <div className="text-error">Error: {rpcStatus.error}</div>}
        </div>

        <div className="mb-2">
          <h3>Oracle Keeper</h3>
          <div className={oracleStatus.isHealthy ? "text-success" : "text-error"}>
            Status: {oracleStatus.isHealthy ? "Healthy" : "Unhealthy"}
          </div>
          {oracleStatus.details && <div>Details: {oracleStatus.details}</div>}
          {oracleStatus.error && <div className="text-error">Error: {oracleStatus.error}</div>}
        </div>

        <div className="mb-5 mt-4">
          <h3 className="text-lg font-medium mb-2">V1 Contract Status</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm mb-1">Vault: {vaultStatus}</div>
              <div className="text-xs bg-gray-800 p-2 rounded break-all">{vaultContractAddress || 'Not connected'}</div>
            </div>
            <div>
              <div className="text-sm mb-1">Router:</div>
              <div className="text-xs bg-gray-800 p-2 rounded break-all">{routerContractAddress || 'Not connected'}</div>
            </div>
            <div>
              <div className="text-sm mb-1">Price Feed:</div>
              <div className="text-xs bg-gray-800 p-2 rounded break-all">{priceFeedContractAddress || 'Not connected'}</div>
            </div>
          </div>
        </div>

        <div className="mb-2">
          <h3>Supported Tokens</h3>
          {supportedTokens.length > 0 ? (
            <div>{supportedTokens.join(', ')}</div>
          ) : (
            <div className="text-warning">No tokens configured</div>
          )}
        </div>

        <div className="mb-2">
          <h3>Token Status</h3>
          <div>{tokenStatus}</div>
        </div>
      </div>
    </Card>
  );
};

export default V1Diagnostics;
