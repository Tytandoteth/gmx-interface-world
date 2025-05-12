import { Contract, ContractRunner, ethers, InterfaceAbi } from "ethers";

import { getContract, CONTRACTS } from "sdk/configs/contracts";
import { GlvRouter__factory } from "typechain-types";
import { DataStore__factory } from "typechain-types/factories/DataStore__factory";
import { ExchangeRouter__factory } from "typechain-types/factories/ExchangeRouter__factory";
import { Multicall__factory } from "typechain-types/factories/Multicall__factory";

const { ZeroAddress } = ethers;

// World Chain Integration Configuration
export const WORLD_CHAIN_ID = 480;

// Test Environment for World Chain
export const TEST_ENVIRONMENT = {
  // Test Tokens
  tokens: {
    TUSD: {
      address: "0xc1f17FB5db2A71617840eCe29c241997448f6720",
      symbol: "TUSD",
      name: "Test USD",
      decimals: 18,
      isStable: true,
      isShortable: false,
      imageUrl: "/icons/tusd.svg"
    },
    TBTC: {
      address: "0x9cdee0fb64c18d3af7C8cB30Aada5f7fe90aF553",
      symbol: "TBTC",
      name: "Test Bitcoin",
      decimals: 8,
      isStable: false,
      isShortable: true,
      imageUrl: "/icons/tbtc.svg"
    },
    TETH: {
      address: "0xE9298442418B800105b86953db930659e5b13058",
      symbol: "TETH",
      name: "Test Ethereum",
      decimals: 18,
      isStable: false,
      isShortable: true,
      imageUrl: "/icons/teth.svg"
    }
  },
  
  // Core Contracts
  contracts: {
    Vault: "0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5",
    Router: "0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b",
    PositionRouter: "0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF",
    PositionManager: "0x0AC8566466e68678d2d32F625d2d3CD9e6cf088D",
    OrderBook: "0x8179D468fF072B8A9203A293a37ef70EdCA850fc",
    SimplePriceFeed: "0xa19F571B0B00A36028Ce47721AFa1395Bb581E5d",
    WitnetPriceRouter: "0x4F1424Cef6940b706f3395a31ab1F1A7dF43845c" // Added Witnet price router
  }
};

export { getContract } from "sdk/configs/contracts";

export const XGMT_EXCLUDED_ACCOUNTS = [
  "0x330eef6b9b1ea6edd620c825c9919dc8b611d5d5",
  "0xd9b1c23411adbb984b1c4be515fafc47a12898b2",
  "0xa633158288520807f91ccc98aa58e0ea43acb400",
  "0xffd0a93b4362052a336a7b22494f1b77018dd34b",
];

function makeGetContract<T extends { abi: InterfaceAbi; connect: (address: string) => unknown }>(
  name: string,
  factory: T
) {
  return (chainId: number, provider?: ContractRunner) =>
    new Contract(getContract(chainId, name), factory.abi, provider) as unknown as ReturnType<T["connect"]>;
}

export const getDataStoreContract = makeGetContract("DataStore", DataStore__factory);
export const getMulticallContract = makeGetContract("Multicall", Multicall__factory);
export const getExchangeRouterContract = makeGetContract("ExchangeRouter", ExchangeRouter__factory);
export const getGlvRouterContract = makeGetContract("GlvRouter", GlvRouter__factory);

export const getZeroAddressContract = (provider?: ContractRunner) => new Contract(ZeroAddress, [], provider);

export function tryGetContract(chainId: number, name: string): string | undefined {
  return CONTRACTS[chainId]?.[name];
}
