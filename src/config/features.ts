import { ARBITRUM, AVALANCHE, WORLD } from "./chains";

/**
 * Determines if V1 contracts are supported for the given chain
 * @param chainId Chain ID to check
 * @returns True if V1 contracts are supported
 */
export function getIsV1Supported(chainId: number): boolean {
  return [AVALANCHE, ARBITRUM, WORLD].includes(chainId);
}
