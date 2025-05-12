/**
 * World Chain custom deployment configuration
 */

import { WORLD } from 'sdk/configs/chains';

/**
 * Configuration for a specific deployment
 */
export interface DeploymentConfig {
  vault: string;
  router: string;
  vaultPriceFeed: string;
  redStonePriceFeed?: string;
  witnetPriceRouter?: string;
  tokens: {
    wld: string;
    wworld: string;
  };
}

/**
 * Deployment configurations for different environments
 */
export const DeploymentConfig = {
  customDev: {
    // Our development deployment with Witnet price feeds
    vault: import.meta.env.VITE_APP_CUSTOM_VAULT_ADDRESS as string || '',
    router: import.meta.env.VITE_APP_CUSTOM_ROUTER_ADDRESS as string || '',
    vaultPriceFeed: import.meta.env.VITE_APP_CUSTOM_VAULT_PRICE_FEED_ADDRESS as string || '',
    redStonePriceFeed: import.meta.env.VITE_APP_CUSTOM_REDSTONE_PRICE_FEED as string || '',
    witnetPriceRouter: import.meta.env.VITE_WITNET_PRICE_ROUTER_ADDRESS as string || '',
    tokens: {
      wld: import.meta.env.VITE_APP_WORLD_WLD_ADDRESS as string || '',
      wworld: import.meta.env.VITE_APP_WORLD_WWORLD_ADDRESS as string || ''
    }
  },
  custom: {
    vault: "0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5",
    router: "0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b",
    vaultPriceFeed: "0x8727D91C1174b4ab7CfD5780296aAE8Ef4b0E6Bf",
    redStonePriceFeed: "0x345bc48E1370fa399D0A6611669726aAC676DBB3", // Legacy RedStonePriceFeed (deprecated)
    witnetPriceRouter: "0x839C2D3aDe63DF5d0A961Fb42f3d42163BE6b979", // Witnet Price Router for on-chain oracle data
    tokens: {
      wld: "0x99A49AaA79b648ee24e85c4eb3A1C9c429A95652",
      wworld: "0xE1a9E792851b22A808639cf8e75D0A4025333f4B"
    }
  }
};

// Local storage key for deployment type
const DEPLOYMENT_TYPE_KEY = 'gmx-worldchain-deployment-type';

// Export type for deployment types
export type DeploymentType = keyof typeof DeploymentConfig;

/**
 * Get the current deployment type based on local storage settings or default to 'custom'
 * @returns DeploymentType - customDev for dev mode, custom for production
 */
export function getDeploymentType(): DeploymentType {
  // Check local storage for saved type
  const savedType = localStorage.getItem(DEPLOYMENT_TYPE_KEY);
  if (savedType && (savedType === 'customDev' || savedType === 'custom')) {
    return savedType as DeploymentType;
  }
  return 'custom';
}

/**
 * Set the deployment type in local storage
 * @param type DeploymentType to save
 */
export function setDeploymentType(type: DeploymentType): void {
  localStorage.setItem(DEPLOYMENT_TYPE_KEY, type);
}

/**
 * Get deployment configuration for a specific chain
 * @param chainId Chain ID to get configuration for
 * @returns Deployment configuration for the specified chain
 */
export function getDeploymentConfig(chainId: number | undefined): DeploymentConfig | null {
  if (!chainId) {
    return null;
  }
  
  // For World Chain
  if (chainId === WORLD) {
    return DeploymentConfig.custom;
  }

  // For development world chain
  if (chainId === 3333) { // Local hardhat network
    return DeploymentConfig.customDev;
  }

  // Default fallback for unknown chains
  return DeploymentConfig.custom;
}

/**
 * Get the current deployment configuration
 * @returns The current deployment configuration based on local storage settings
 */
export function getCurrentDeployment(): DeploymentConfig {
  const type = getDeploymentType();
  return DeploymentConfig[type];
}

/**
 * Get the active deployment configuration (alias for getCurrentDeployment)
 * @returns The active deployment configuration based on local storage settings
 */
export function getActiveDeployment(): DeploymentConfig {
  return getCurrentDeployment();
}

/**
 * Toggle between deployment types (custom and customDev)
 * @returns The new deployment type after toggling
 */
export function toggleDeploymentType(): DeploymentType {
  const currentType = getDeploymentType();
  const newType: DeploymentType = currentType === 'custom' ? 'customDev' : 'custom';
  setDeploymentType(newType);
  return newType;
}
