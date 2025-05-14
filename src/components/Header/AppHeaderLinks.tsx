import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { FiX } from "react-icons/fi";
import { Link } from "react-router-dom";

import { isHomeSite } from "lib/legacy";
import { isDevelopment } from "config/env";
import { useNotifyModalState } from "lib/useNotifyModalState";
import { userAnalytics } from "lib/userAnalytics";
import { ReferralTopMenuClickEvent } from "lib/userAnalytics/types";

import ExternalLink from "components/ExternalLink/ExternalLink";

import logoImg from "img/logo_GMX.svg";

import { HeaderLink } from "./HeaderLink";

import "./Header.scss";

type Props = {
  small?: boolean;
  clickCloseIcon?: () => void;
  openSettings?: () => void;
  showRedirectModal: (to: string) => void;
};

export function AppHeaderLinks({ small, openSettings, clickCloseIcon, showRedirectModal }: Props) {
  const { openNotifyModal } = useNotifyModalState();

  const isLeaderboardActive = useCallback(
    (match, location) => Boolean(match) || location.pathname.startsWith("/competitions"),
    []
  );
  return (
    <div className="App-header-links">
      {small && (
        <div className="App-header-links-header">
          <Link className="App-header-link-main" to="/">
            <img src={logoImg} alt="GMX Logo" />
          </Link>
          <div
            className="App-header-menu-icon-block max-w-[450px]:mr-12 mr-8 !border-0"
            onClick={() => clickCloseIcon && clickCloseIcon()}
          >
            <FiX className="App-header-menu-icon" />
          </div>
        </div>
      )}
      <div className="App-header-link-container">
        <HeaderLink qa="dashboard" to="/dashboard" showRedirectModal={showRedirectModal}>
          <Trans>Dashboard</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink qa="worldchain" to="/worldchain" showRedirectModal={showRedirectModal}>
          <Trans>World Chain</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink qa="earn" to="/earn" showRedirectModal={showRedirectModal}>
          <Trans>Earn</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink qa="buy" to="/buy" showRedirectModal={showRedirectModal}>
          <Trans>Buy</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink
          onClick={() => {
            userAnalytics.pushEvent<ReferralTopMenuClickEvent>({
              event: "ReferralCodeAction",
              data: {
                action: "ReferralTopMenuClick",
              },
            });
          }}
          qa="referrals"
          to="/referrals"
          showRedirectModal={showRedirectModal}
        >
          <Trans>Referrals</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink
          qa="leaderboard"
          to="/leaderboard"
          showRedirectModal={showRedirectModal}
          isActive={isLeaderboardActive}
        >
          <Trans>Leaderboard</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink qa="ecosystem" to="/ecosystem" showRedirectModal={showRedirectModal}>
          <Trans>Ecosystem</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <ExternalLink href="https://docs.gmx.io/">
          <Trans>Docs</Trans>
        </ExternalLink>
      </div>
      
      {/* World Chain specific links - only visible in production or with production mode enabled */}
      {(isDevelopment() || import.meta.env.VITE_USE_PRODUCTION_MODE === 'true') && (
        <div className="App-header-link-container">
          <div className="header-dropdown">
            <div className="header-dropdown-label">
              <Trans>World Chain</Trans>
            </div>
            <div className="header-dropdown-menu">
              <HeaderLink to="/worldchain/contract-testing" className="header-dropdown-link" showRedirectModal={showRedirectModal}>
                <Trans>Contract Testing</Trans>
              </HeaderLink>
              <HeaderLink to="/worldchain/dev-tools" className="header-dropdown-link" showRedirectModal={showRedirectModal}>
                <Trans>Dev Tools</Trans>
              </HeaderLink>
              <HeaderLink to="/worldchain/price-feed" className="header-dropdown-link" showRedirectModal={showRedirectModal}>
                <Trans>Price Feed</Trans>
              </HeaderLink>
            </div>
          </div>
        </div>
      )}
      {small && (
        <div className="App-header-link-container">
          <a href="#" onClick={openNotifyModal}>
            <Trans>Alerts</Trans>
          </a>
        </div>
      )}
      {small && !isHomeSite() && (
        <div className="App-header-link-container">
          {/* eslint-disable-next-line */}
          <a href="#" data-qa="settings" onClick={openSettings}>
            <Trans>Settings</Trans>
          </a>
        </div>
      )}
    </div>
  );
}
