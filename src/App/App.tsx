import "@wagmi/connectors";

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useEffect } from "react";
import { HashRouter as Router } from "react-router-dom";
import { SWRConfig } from "swr";

import "react-toastify/dist/ReactToastify.css";
import "styles/Font.css";
import "styles/Input.css";
import "styles/Shared.scss";
import "styles/recharts.css";
import "./App.scss";

import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import { GlobalStateProvider } from "context/GlobalContext/GlobalContextProvider";
import { OraclePricesProvider } from "context/OraclePricesContext";
import { PendingTxnsContextProvider } from "context/PendingTxnsContext/PendingTxnsContext";
import { SettingsContextProvider } from "context/SettingsContext/SettingsContextProvider";
import { SorterContextProvider } from "context/SorterContext/SorterContextProvider";
import { SubaccountContextProvider } from "context/SubaccountContext/SubaccountContext";
import { SyntheticsEventsProvider } from "context/SyntheticsEvents";
import { TokensBalancesContextProvider } from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { TokensFavoritesContextProvider } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { WebsocketContextProvider } from "context/WebsocketContext/WebsocketContextProvider";
import { WorldChainProvider } from "context/WorldChainContext";
import { WorldChainV1Provider } from "context/WorldChainV1Context";
import { WorldChainTradingProvider } from "lib/worldchain/WorldChainTradingProvider";
import { useChainId } from "lib/chains";
import { defaultLocale, dynamicActivate } from "lib/i18n";
import { RainbowKitProviderWrapper } from "lib/wallets/WalletProvider";
import { initWorldChainConfig, initWorldChainDevMode, initWorldChainMetrics, initWorldChainMulticallHandler } from "lib/worldchain";
import DiagnosticsPanel from "lib/worldchain/DiagnosticsPanel";
import { WorldChainTester } from "lib/worldchain/testingTools";

import SEO from "components/Common/SEO";
import { WorldChainDevBanner } from "components/WorldChainDevMode";
import ProductionModeToggle from "components/WorldChainDevMode/ProductionModeToggle";
import ProductionStatusIndicator from "components/WorldChainDevMode/ProductionStatusIndicator";

import { AppRoutes } from "./AppRoutes";
import { SWRConfigProp } from "./swrConfig";

// @ts-ignore
if (window?.ethereum?.autoRefreshOnNetworkChange) {
  // @ts-ignore
  window.ethereum.autoRefreshOnNetworkChange = false;
}

function App() {
  const { chainId } = useChainId();

  // Initialize language settings
  useEffect(() => {
    const defaultLanguage = localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale;
    dynamicActivate(defaultLanguage);
  }, []);
  
  // Initialize World Chain configuration and settings
  // This ensures Oracle Keeper and contract settings are properly configured
  useEffect(() => {
    // Log the environment variables for contracts
    console.log("World Chain Environment:", {
      VAULT_ADDRESS: import.meta.env.VITE_VAULT_ADDRESS,
      ROUTER_ADDRESS: import.meta.env.VITE_ROUTER_ADDRESS,
      POSITION_ROUTER_ADDRESS: import.meta.env.VITE_POSITION_ROUTER_ADDRESS,
      POSITION_MANAGER_ADDRESS: import.meta.env.VITE_POSITION_MANAGER_ADDRESS,
      ORACLE_KEEPER_URL: import.meta.env.VITE_ORACLE_KEEPER_URL,
      RPC_URL: import.meta.env.VITE_WORLD_RPC_URL,
      PRODUCTION_MODE: import.meta.env.VITE_USE_PRODUCTION_MODE,
    });

    // Initialize WorldChainConfig first to ensure it's ready for all components
    // This prevents "Cannot read property 'feature_flags' of undefined" errors
    initWorldChainConfig();
    
    // Then initialize World Chain development mode with proper Oracle Keeper settings
    initWorldChainDevMode();
    
    // Initialize World Chain metrics handling
    // This prevents metrics errors when in development mode
    initWorldChainMetrics();
    
    // Initialize World Chain multicall error handler
    // This provides fallback data for multicall errors
    initWorldChainMulticallHandler();
    
    // Store current chain ID in window for easier access by handlers
    (window as any).currentChainId = chainId;
  }, [chainId]);

  let app = (
    <>
      <WorldChainDevBanner />
      <AppRoutes />
      <ProductionModeToggle />
      <ProductionStatusIndicator />
      <DiagnosticsPanel />
      <WorldChainTester />
    </>
  );
  app = <SorterContextProvider>{app}</SorterContextProvider>;
  app = <TokensFavoritesContextProvider>{app}</TokensFavoritesContextProvider>;
  app = <SyntheticsEventsProvider>{app}</SyntheticsEventsProvider>;
  app = <SubaccountContextProvider>{app}</SubaccountContextProvider>;
  app = <TokensBalancesContextProvider>{app}</TokensBalancesContextProvider>;
  app = <WebsocketContextProvider>{app}</WebsocketContextProvider>;
  app = <WorldChainProvider>{app}</WorldChainProvider>;
  app = <WorldChainV1Provider>{app}</WorldChainV1Provider>;
  app = <WorldChainTradingProvider>{app}</WorldChainTradingProvider>;
  app = <OraclePricesProvider pollInterval={15000}>{app}</OraclePricesProvider>;
  app = <SEO>{app}</SEO>;
  app = <RainbowKitProviderWrapper>{app}</RainbowKitProviderWrapper>;
  app = <I18nProvider i18n={i18n as any}>{app}</I18nProvider>;
  app = <PendingTxnsContextProvider>{app}</PendingTxnsContextProvider>;
  app = <SettingsContextProvider>{app}</SettingsContextProvider>;
  app = (
    <SWRConfig key={chainId} value={SWRConfigProp}>
      {app}
    </SWRConfig>
  );
  app = <GlobalStateProvider>{app}</GlobalStateProvider>;
  app = <Router>{app}</Router>;

  return app;
}

export default App;
