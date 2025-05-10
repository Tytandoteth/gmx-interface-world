import React from 'react';
import SEO from 'components/Common/SEO';
import RedstoneTest from 'components/RedstoneTest';

import './RedstoneTestPage.css';

/**
 * Page for testing the RedStone integration
 */
const RedstoneTestPage: React.FC = () => {
  return (
    <>
      <SEO
        title="RedStone Integration | GMX"
        description="Test the RedStone price feed integration for GMX on World Chain"
      />
      <div className="RedstoneTestPage">
        <div className="RedstoneTestPage-container">
          <RedstoneTest />
        </div>
      </div>
    </>
  );
};

export default RedstoneTestPage;
