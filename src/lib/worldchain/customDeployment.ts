/**
 * Utility for managing custom World Chain deployment configuration
 * This allows switching between the original deployment and our custom deployment
 * with RedStone price feeds
 */

// Configuration interface for deployments
export interface DeploymentConfig {
  vault: string;
  router: string; 
  vaultPriceFeed: string;
  redStonePriceFeed: string;
  tokens: {
    wld: string;
    wworld: string;
    [key: string]: string;
  };
}

// Deployment configurations
export const DEPLOYMENTS: Record<'original' | 'custom', DeploymentConfig> = {
  original: {
    // These should use the environment variables or default to empty strings
    vault: import.meta.env.VITE_APP_WORLD_VAULT_ADDRESS as string || '',
    router: import.meta.env.VITE_APP_WORLD_ROUTER_ADDRESS as string || '',
    vaultPriceFeed: import.meta.env.VITE_APP_WORLD_VAULT_PRICE_FEED_ADDRESS as string || '',
    redStonePriceFeed: import.meta.env.VITE_APP_WORLD_REDSTONE_PRICE_FEED as string || '',
    tokens: {
      wld: import.meta.env.VITE_APP_WORLD_WLD_ADDRESS as string || '',
      wworld: import.meta.env.VITE_APP_WORLD_WWORLD_ADDRESS as string || ''
    }
  },
  custom: {
    vault: "0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5",
    router: "0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b",
    vaultPriceFeed: "0x8727D91C1174b4ab7CfD5780296aAE8Ef4b0E6Bf",
    redStonePriceFeed: "0x345bc48E1370fa399D0A6611669726aAC676DBB3", // Updated RedStonePriceFeed with enhanced interface
    tokens: {
      wld: "0x99A49AaA79b648ee24e85c4eb3A1C9c429A95652",
      wworld: "0xE1a9E792851b22A808639cf8e75D0A4025333f4B"
    }
  }
};

// Local storage key for deployment type
const DEPLOYMENT_TYPE_KEY = 'gmx-worldchain-deployment-type';

// Get current deployment type from local storage
export function getDeploymentType(): 'original' | 'custom' {
  return (localStorage.getItem(DEPLOYMENT_TYPE_KEY) as 'original' | 'custom') || 'original';
}

// Set deployment type in local storage
export function setDeploymentType(type: 'original' | 'custom'): void {
  localStorage.setItem(DEPLOYMENT_TYPE_KEY, type);
}

// Toggle between deployment types
export function toggleDeploymentType(): 'original' | 'custom' {
  const current = getDeploymentType();
  const next = current === 'original' ? 'custom' : 'original';
  setDeploymentType(next);
  return next;
}

// Get the active deployment configuration
export function getActiveDeployment(): DeploymentConfig {
  return DEPLOYMENTS[getDeploymentType()];
}
