import React from 'react';

import { getPageTitle } from 'lib/legacy';

import SEO from 'components/Common/SEO';
import SimplePriceFeedTest from 'components/SimplePriceFeedTest';

export default function SimplePriceFeedDebug() {
  return (
    <div className="default-container page-layout">
      <SEO title={getPageTitle("SimplePriceFeed Debug")} />
      
      <div className="section-title-block">
        <div className="section-title-icon"></div>
        <div className="section-title-content">
          <h2 className="section-title-text">SimplePriceFeed Debug</h2>
        </div>
      </div>

      <div className="App-card">
        <div className="App-card-title">
          <div className="App-card-title-mark">
            <div className="App-card-title-mark-icon"></div>
            <div className="App-card-title-mark-title">Test SimplePriceFeed Integration</div>
          </div>
        </div>
        
        <div className="App-card-divider"></div>
        
        <div className="App-card-content">
          <SimplePriceFeedTest />
        </div>
      </div>
    </div>
  );
}
