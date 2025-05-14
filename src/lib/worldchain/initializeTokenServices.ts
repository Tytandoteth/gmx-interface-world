/**
 * Token Services Initialization
 * 
 * This file provides a central initialization point for all token-related services.
 * It should be imported and called at the application startup.
 */

import { Logger } from 'lib/logger';
import { isProductionEnvironment, getEnvironment } from './environmentUtils';
import { tokenManager, initializeTokens } from 'services/TokenConfigurationManager';
import { tokenPriceManager } from 'services/TokenPriceService';
import { initializeTokenAddresses } from 'services/TokenAddressService';

/**
 * Initialize all token services
 * This should be called once at application startup
 */
export function initializeTokenServices(): void {
  try {
    const environment = getEnvironment();
    Logger.info(`Initializing token services in ${environment} environment`);
    
    // Step 1: Initialize token addresses from environment variables
    initializeTokenAddresses();
    
    // Step 2: Initialize token configuration 
    initializeTokens();
    
    // Step 3: Set up default prices for tokens if needed
    const defaultPrices = {
      WLD: 1.25,
      WETH: 3550.00,
      ETH: 3550.00,
      USDC: 1.00,
      MAG: 2.50
    };
    
    // Only use default prices as fallbacks
    tokenPriceManager.updatePrices(defaultPrices);
    
    // Step 4: Update the token manager with initial prices
    tokenManager.updatePrices(defaultPrices);
    
    Logger.info('Token services initialized successfully');
  } catch (error) {
    if (!isProductionEnvironment()) {
      Logger.error('Failed to initialize token services:', error);
    } else {
      // In production, don't expose error details
      Logger.error('Failed to initialize token services. Check environment variables and configuration.');
    }
  }
}

/**
 * Shutdown token services (useful for cleanup)
 */
export function shutdownTokenServices(): void {
  // Currently a no-op, but useful for future cleanup needs
  Logger.debug('Token services shutdown');
}
