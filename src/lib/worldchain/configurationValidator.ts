/**
 * World Chain Configuration Validator
 * Validates environment variables and configuration settings for World Chain integration
 */

import { WorldLogger } from '../debug';

export interface ConfigValidationResult {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Types of environment variables
 */
export enum EnvVarType {
  REQUIRED = 'required',
  OPTIONAL = 'optional',
  CONDITIONAL = 'conditional'
}

/**
 * Environment variable definition
 */
interface EnvVarDefinition {
  name: string;
  type: EnvVarType;
  description: string;
  condition?: string;
}

/**
 * World Chain environment variable definitions
 */
const WORLD_CHAIN_ENV_VARS: EnvVarDefinition[] = [
  { name: 'VITE_APP_WORLD_CHAIN_URL', type: EnvVarType.REQUIRED, description: 'RPC URL for World Chain' },
  { name: 'VITE_APP_USE_PRODUCTION_MODE', type: EnvVarType.REQUIRED, description: 'Whether to use production mode' },
  { name: 'VITE_APP_ORACLE_KEEPER_URL', type: EnvVarType.REQUIRED, description: 'URL for Oracle Keeper API' },
  
  // Required in production mode only
  { 
    name: 'VITE_APP_WORLD_VAULT_ADDRESS', 
    type: EnvVarType.CONDITIONAL, 
    description: 'Address of the GMX Vault contract',
    condition: 'VITE_APP_USE_PRODUCTION_MODE=true'
  },
  { 
    name: 'VITE_APP_WORLD_ROUTER_ADDRESS', 
    type: EnvVarType.CONDITIONAL, 
    description: 'Address of the GMX Router contract',
    condition: 'VITE_APP_USE_PRODUCTION_MODE=true'
  },
  { 
    name: 'VITE_APP_WORLD_POSITION_ROUTER_ADDRESS', 
    type: EnvVarType.CONDITIONAL, 
    description: 'Address of the GMX Position Router contract',
    condition: 'VITE_APP_USE_PRODUCTION_MODE=true'
  },
  { 
    name: 'VITE_APP_WORLD_POSITION_MANAGER_ADDRESS', 
    type: EnvVarType.CONDITIONAL, 
    description: 'Address of the GMX Position Manager contract',
    condition: 'VITE_APP_USE_PRODUCTION_MODE=true'
  },
  { 
    name: 'VITE_APP_WORLD_VAULT_PRICE_FEED_ADDRESS', 
    type: EnvVarType.CONDITIONAL, 
    description: 'Address of the VaultPriceFeed contract',
    condition: 'VITE_APP_USE_PRODUCTION_MODE=true'
  },
  
  // Token addresses (required in production mode)
  { 
    name: 'VITE_APP_WORLD_WLD_TOKEN', 
    type: EnvVarType.CONDITIONAL, 
    description: 'Address of the WLD token',
    condition: 'VITE_APP_USE_PRODUCTION_MODE=true'
  },
  { 
    name: 'VITE_APP_WORLD_ETH_TOKEN', 
    type: EnvVarType.CONDITIONAL, 
    description: 'Address of the ETH token',
    condition: 'VITE_APP_USE_PRODUCTION_MODE=true'
  },
  { 
    name: 'VITE_APP_WORLD_USDC_TOKEN', 
    type: EnvVarType.CONDITIONAL, 
    description: 'Address of the USDC token',
    condition: 'VITE_APP_USE_PRODUCTION_MODE=true'
  },
  { 
    name: 'VITE_APP_WORLD_MAG_TOKEN', 
    type: EnvVarType.CONDITIONAL, 
    description: 'Address of the MAG token',
    condition: 'VITE_APP_USE_PRODUCTION_MODE=true'
  },
  { 
    name: 'VITE_APP_WORLD_BTC_TOKEN', 
    type: EnvVarType.CONDITIONAL, 
    description: 'Address of the BTC token',
    condition: 'VITE_APP_USE_PRODUCTION_MODE=true'
  },
  { 
    name: 'VITE_APP_WORLD_USDT_TOKEN', 
    type: EnvVarType.CONDITIONAL, 
    description: 'Address of the USDT token',
    condition: 'VITE_APP_USE_PRODUCTION_MODE=true'
  },
  
  // Optional
  { 
    name: 'VITE_APP_LOG_LEVEL', 
    type: EnvVarType.OPTIONAL, 
    description: 'Logging level (0-5)'
  },
  { 
    name: 'VITE_APP_COINGECKO_API_KEY', 
    type: EnvVarType.OPTIONAL, 
    description: 'API key for CoinGecko'
  }
];

/**
 * Check if a condition is met for a conditional environment variable
 */
const isConditionMet = (condition: string): boolean => {
  if (!condition) return true;
  
  const [varName, expectedValue] = condition.split('=');
  const actualValue = import.meta.env[varName];
  
  return actualValue === expectedValue;
};

/**
 * Validates all World Chain environment variables
 * @returns Validation result with details about missing or invalid variables
 */
export const validateWorldChainConfig = (): ConfigValidationResult => {
  const result: ConfigValidationResult = {
    isValid: true,
    missingVars: [],
    warnings: [],
    errors: []
  };
  
  // Check environment variables
  for (const envVar of WORLD_CHAIN_ENV_VARS) {
    const value = import.meta.env[envVar.name];
    const isRequired = 
      envVar.type === EnvVarType.REQUIRED || 
      (envVar.type === EnvVarType.CONDITIONAL && isConditionMet(envVar.condition || ''));
    
    if (isRequired && !value) {
      result.isValid = false;
      result.missingVars.push(envVar.name);
      result.errors.push(`Missing required environment variable: ${envVar.name} (${envVar.description})`);
    } else if (!isRequired && !value && envVar.type === EnvVarType.OPTIONAL) {
      result.warnings.push(`Missing optional environment variable: ${envVar.name} (${envVar.description})`);
    }
  }
  
  // Validate URL format for RPC and Oracle Keeper
  const rpcUrl = import.meta.env.VITE_APP_WORLD_CHAIN_URL;
  const oracleKeeperUrl = import.meta.env.VITE_APP_ORACLE_KEEPER_URL;
  
  if (rpcUrl && !rpcUrl.startsWith('http')) {
    result.isValid = false;
    result.errors.push(`Invalid RPC URL format: ${rpcUrl}. Must start with http:// or https://`);
  }
  
  if (oracleKeeperUrl && !oracleKeeperUrl.startsWith('http')) {
    result.isValid = false;
    result.errors.push(`Invalid Oracle Keeper URL format: ${oracleKeeperUrl}. Must start with http:// or https://`);
  }
  
  // Validate production mode settings
  const productionMode = import.meta.env.VITE_APP_USE_PRODUCTION_MODE === 'true';
  
  if (productionMode) {
    // Check if we have all the required contract addresses for production mode
    if (result.missingVars.some(v => v.includes('ADDRESS'))) {
      result.errors.push('Production mode enabled but some contract addresses are missing');
    }
    
    // Check if we have all the required token addresses for production mode
    if (result.missingVars.some(v => v.includes('TOKEN'))) {
      result.errors.push('Production mode enabled but some token addresses are missing');
    }
  }
  
  // Log validation results
  if (result.isValid) {
    WorldLogger.info('World Chain configuration validated successfully');
  } else {
    WorldLogger.error('World Chain configuration validation failed', {
      errors: result.errors,
      warnings: result.warnings,
      missingVars: result.missingVars
    });
  }
  
  return result;
};

/**
 * Reports the configuration validation results
 */
export const reportConfigValidation = (): void => {
  const result = validateWorldChainConfig();
  
  if (!result.isValid) {
    console.group('%c❌ World Chain Configuration Invalid', 'color: red; font-weight: bold;');
    
    if (result.errors.length > 0) {
      console.error('Errors:');
      result.errors.forEach(err => console.error(`- ${err}`));
    }
    
    if (result.warnings.length > 0) {
      console.warn('Warnings:');
      result.warnings.forEach(warn => console.warn(`- ${warn}`));
    }
    
    console.info('Please check your .env.local or .env.production file for missing variables');
    console.groupEnd();
  } else {
    console.group('%c✅ World Chain Configuration Valid', 'color: green; font-weight: bold;');
    
    if (result.warnings.length > 0) {
      console.warn('Warnings:');
      result.warnings.forEach(warn => console.warn(`- ${warn}`));
    }
    
    console.info('All required environment variables are present');
    console.groupEnd();
  }
};
