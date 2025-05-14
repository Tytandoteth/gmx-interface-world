import { Trans } from "@lingui/macro";
import { Provider, ethers } from "ethers";
import { useEffect, useRef, Suspense, lazy } from "react";
import { Redirect, Route, Switch } from "react-router-dom";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import { isDevelopment } from "config/env";
import { subscribeToV1Events } from "context/WebsocketContext/subscribeToEvents";
import { useWebsocketProvider } from "context/WebsocketContext/WebsocketContextProvider";
import { useChainId } from "lib/chains";
import { useHasLostFocus } from "lib/useHasPageLostFocus";
import { abis } from "sdk/abis";

import Debug from "components/Debug/Debug";
import TestingPanel from "components/WorldChainDevMode/TestingPanel";

import WorldChainExchange from "pages/WorldChainExchange";
import WorldChainDevTools from "pages/DevTools/WorldChainDevTools";
import ContractTestingPage from "pages/ContractTesting/ContractTestingPage";
import { AccountsRouter } from "pages/Actions/ActionsRouter";
import BeginAccountTransfer from "pages/BeginAccountTransfer/BeginAccountTransfer";
import Buy from "pages/Buy/Buy";
import BuyGlp from "pages/BuyGlp/BuyGlp";
import BuyGMX from "pages/BuyGMX/BuyGMX";
import CompleteAccountTransfer from "pages/CompleteAccountTransfer/CompleteAccountTransfer";
import DashboardV2 from "pages/Dashboard/DashboardV2";
import Earn from "pages/Earn/Earn";
import Ecosystem from "pages/Ecosystem/Ecosystem";
import { Exchange } from "pages/Exchange/Exchange";
import OrdersOverview from "pages/OrdersOverview/OrdersOverview";
import PageNotFound from "pages/PageNotFound/PageNotFound";
import { ParseTransactionPage } from "pages/ParseTransaction/ParseTransaction";
import PositionsOverview from "pages/PositionsOverview/PositionsOverview";
import RedstoneTestPage from "pages/RedstoneTestPage";
import Referrals from "pages/Referrals/Referrals";
import SimplePriceFeedDebug from "pages/SimplePriceFeedDebug";
import ReferralsTier from "pages/ReferralsTier/ReferralsTier";
import Stats from "pages/Stats/Stats";
import { validatePaths } from "../debug/validation";

const LazyUiPage = lazy(() => import("pages/UiPage/UiPage"));
export const UiPage = () => <Suspense fallback={<Trans>Loading...</Trans>}>{<LazyUiPage />}</Suspense>;

export function MainRoutes({ openSettings }: { openSettings: () => void }) {
  const exchangeRef = useRef<any>();
  const { hasV1LostFocus } = useHasLostFocus();
  const { chainId } = useChainId();
  
  // Validate import paths only in development
  useEffect(() => {
    if (isDevelopment()) {
      // Check if Debug component is properly loaded
      // eslint-disable-next-line no-console
      console.log("[PATH_DEBUG] Available Debug components:", Debug);
      
      // Run path validation if available
      validatePaths?.();
    }
  }, []);

  const { wsProvider } = useWebsocketProvider();

  const vaultAddress = getContract(chainId, "Vault");
  const positionRouterAddress = getContract(chainId, "PositionRouter");

  useEffect(() => {
    const wsVaultAbi = chainId === ARBITRUM ? abis.VaultV2 : abis.VaultV2b;
    if (hasV1LostFocus || !wsProvider) {
      return;
    }

    const wsVault = new ethers.Contract(vaultAddress, wsVaultAbi, wsProvider as Provider);
    const wsPositionRouter = new ethers.Contract(positionRouterAddress, abis.PositionRouter, wsProvider as Provider);

    const callExchangeRef = (method, ...args) => {
      if (!exchangeRef || !exchangeRef.current) {
        return;
      }

      exchangeRef.current[method](...args);
    };

    // handle the subscriptions here instead of within the Exchange component to avoid unsubscribing and re-subscribing
    // each time the Exchange components re-renders, which happens on every data update
    const unsubscribe = subscribeToV1Events(wsVault, wsPositionRouter, callExchangeRef);

    return function cleanup() {
      unsubscribe();
    };
  }, [chainId, vaultAddress, positionRouterAddress, wsProvider, hasV1LostFocus]);

  return (
    <Switch>
      {/* Redirect all root and trade paths to V1 interface */}
      <Route exact path="/">
        <Redirect to="/v1" />
      </Route>
      <Route exact path="/trade">
        <Redirect to="/v1" />
      </Route>
      <Route exact path="/trade/:tradeType">
        <Redirect to="/v1/:tradeType" />
      </Route>

      {/* Main V1 trading interface */}
      <Route exact path="/v1/:tradeType?">
        <Exchange ref={exchangeRef} openSettings={openSettings} />
      </Route>

      {/* Dashboard and stats */}
      <Route exact path="/dashboard">
        <DashboardV2 />
      </Route>
      <Route exact path="/stats">
        <Stats />
      </Route>
      <Redirect exact from="/stats/v2" to="/stats" />
      <Redirect exact from="/stats/v1" to="/stats" />

      {/* Earn, Buy, and other GMX features */}
      <Route exact path="/earn">
        <Earn />
      </Route>
      <Route exact path="/buy">
        <Buy />
      </Route>
      <Route exact path="/buy_glp">
        <BuyGlp />
      </Route>
      <Route exact path="/buy_gmx">
        <BuyGMX />
      </Route>

      {/* World Chain specific tools */}
      <Route exact path="/worldchain">
        <WorldChainExchange />
      </Route>
      <Route exact path="/worldchain/dev-tools">
        <WorldChainDevTools />
      </Route>
      <Route exact path="/worldchain/contract-testing">
        <ContractTestingPage />
      </Route>
      <Route exact path="/redstone-test">
        <RedstoneTestPage />
      </Route>
      
      {/* Testing panels for World Chain Development */}
      <Route exact path="/worldchain/testing">
        <TestingPanel />
      </Route>
      <Route exact path="/pricefeed-debug">
        <SimplePriceFeedDebug />
      </Route>

      {/* Other GMX platform pages */}
      <Route exact path="/ecosystem">
        <Ecosystem />
      </Route>
      <Route exact path="/referrals">
        <Referrals />
      </Route>
      <Route exact path="/referrals/:account">
        <Referrals />
      </Route>

      {/* Redirect V2 paths to V1 */}
      <Redirect from="/v2" to="/v1" />
      
      {/* Debug tools */}
      <Route path="/debug">
        <Debug />
      </Route>

      {/* Simplified account routes for World Chain */}
      <Route exact path="/actions/:account">
        <Redirect to="/accounts/:account" />
      </Route>
      <Redirect exact from="/actions" to="/accounts" />

      <Route exact path="/accounts">
        <AccountsRouter />
      </Route>

      <Route exact path="/referrals-tier">
        <ReferralsTier />
      </Route>
      <Route exact path="/stats">
        <Stats />
      </Route>
      <Route exact path="/orders_overview">
        <OrdersOverview />
      </Route>
      <Route exact path="/positions_overview">
        <PositionsOverview />
      </Route>
      <Route exact path="/begin_account_transfer">
        <BeginAccountTransfer />
      </Route>
      <Route exact path="/complete_account_transfer/:sender/:receiver">
        <CompleteAccountTransfer />
      </Route>
      {isDevelopment() && (
        <Route exact path="/ui">
          <UiPage />
        </Route>
      )}
      <Route path="/parsetx/:network/:tx">
        <ParseTransactionPage />
      </Route>

      {/* Removed competition routes for World Chain */}
        
      <Route exact path="/debug">
        <Debug />
      </Route>
      
      <Route exact path="/worldchain/testing">
        <TestingPanel />
      </Route>
      
      <Route exact path="/worldchain/price-feed">
        <SimplePriceFeedDebug />
      </Route>

      <Route path="*">
        <PageNotFound />
      </Route>
    </Switch>
  );
}
