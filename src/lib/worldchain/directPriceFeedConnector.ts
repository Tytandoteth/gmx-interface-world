/**
 * Direct Price Feed Connector
 * 
 * This utility connects Oracle Keeper direct price feeds to World Chain contracts.
 * It provides functions to fetch the latest prices and format them for use in contract calls.
 */

import { ethers } from "ethers";
import axios from "axios";

import { getContract } from "../../config/contracts";
import { Logger } from "../logger";
import { WORLD } from "../../config/chains";
import { bigNumberify } from "../../lib/numbers";

// Create a simple logger interface
const logger = {
  error: (...args: any[]) => Logger.error("[DirectPriceFeedConnector]", ...args),
  warn: (...args: any[]) => Logger.warn("[DirectPriceFeedConnector]", ...args),
  info: (...args: any[]) => Logger.info("[DirectPriceFeedConnector]", ...args),
  debug: (...args: any[]) => Logger.debug("[DirectPriceFeedConnector]", ...args),
};

interface DirectPriceData {
  [tokenSymbol: string]: number;
}

interface PriceFeedResponse {
  prices: DirectPriceData;
  timestamp: number;
  source: string;
}

/**
 * Fetch the latest prices from the Oracle Keeper
 */
export async function fetchDirectPrices(): Promise<DirectPriceData> {
  try {
    const oracleKeeperUrl = import.meta.env.VITE_ORACLE_KEEPER_URL;
    
    if (!oracleKeeperUrl) {
      logger.error("Oracle Keeper URL not configured");
      throw new Error("Oracle Keeper URL not configured");
    }

    const response = await axios.get<PriceFeedResponse>(`${oracleKeeperUrl}/direct-prices`);
    
    if (!response.data || !response.data.prices) {
      logger.error("Invalid response from Oracle Keeper", response.data);
      throw new Error("Invalid response from Oracle Keeper");
    }
    
    logger.debug("Direct prices fetched successfully", response.data);
    return response.data.prices;
  } catch (error) {
    logger.error("Failed to fetch direct prices", error);
    throw error;
  }
}

/**
 * Format a price for use in a contract call
 * @param price Price as a floating point number
 * @returns Price formatted as a bigint with 30 decimals
 */
export function formatPriceForContract(price: number): bigint {
  // Prices in contracts are expected to have 30 decimals
  return bigNumberify(Math.round(price * 10**30));
}

/**
 * Get a formatted price map for all tokens
 * @returns A map of token symbols to formatted prices
 */
export async function getFormattedPriceMap(): Promise<Record<string, bigint>> {
  const prices = await fetchDirectPrices();
  const formattedPrices: Record<string, bigint> = {};
  
  for (const [symbol, price] of Object.entries(prices)) {
    if (price) {
      formattedPrices[symbol] = formatPriceForContract(price);
    }
  }
  
  return formattedPrices;
}

/**
 * Check if the Oracle Keeper is healthy and connected
 */
export async function checkOracleKeeperHealth(): Promise<boolean> {
  try {
    const oracleKeeperUrl = import.meta.env.VITE_ORACLE_KEEPER_URL;
    
    if (!oracleKeeperUrl) {
      return false;
    }

    const response = await axios.get(`${oracleKeeperUrl}/health`);
    return response.status === 200 && response.data.status === "ok";
  } catch (error) {
    logger.error("Oracle Keeper health check failed", error);
    return false;
  }
}

/**
 * Get the SimplePriceFeed contract on World Chain
 */
export function getSimplePriceFeedContract(provider: ethers.Provider): ethers.Contract {
  const address = getContract(WORLD, "SimplePriceFeed");
  const abi = ["function getPrice(address token) view returns (uint256)"];
  
  if (!address) {
    throw new Error("SimplePriceFeed contract address not configured");
  }
  
  return new ethers.Contract(address, abi, provider);
}

/**
 * Fetch a token price directly from the SimplePriceFeed contract
 */
export async function fetchPriceFromContract(
  token: string,
  provider: ethers.Provider
): Promise<bigint> {
  try {
    const priceFeed = getSimplePriceFeedContract(provider);
    return await priceFeed.getPrice(token);
  } catch (error) {
    logger.error(`Failed to fetch price for token ${token}`, error);
    throw error;
  }
}

/**
 * Utility to verify that the on-chain price matches the direct price feed
 */
export async function verifyPriceConsistency(
  symbol: string,
  tokenAddress: string, 
  provider: ethers.Provider
): Promise<boolean> {
  try {
    // Get price from direct feed
    const directPrices = await fetchDirectPrices();
    const directPrice = directPrices[symbol];
    
    if (!directPrice) {
      logger.error(`Price for ${symbol} not found in direct feed`);
      return false;
    }
    
    // Get price from contract
    const contractPrice = await fetchPriceFromContract(tokenAddress, provider);
    const contractPriceValue = parseFloat(ethers.formatUnits(contractPrice, 30));
    
    // Check if prices are within 1% of each other
    const priceDifference = Math.abs(directPrice - contractPriceValue) / directPrice;
    const isConsistent = priceDifference < 0.01;
    
    if (!isConsistent) {
      logger.warn(
        `Price inconsistency detected for ${symbol}: direct=${directPrice}, contract=${contractPriceValue}, diff=${priceDifference}`
      );
    }
    
    return isConsistent;
  } catch (error) {
    logger.error(`Failed to verify price consistency for ${symbol}`, error);
    return false;
  }
}
