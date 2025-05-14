/**
 * Development Tools Component
 * 
 * Provides development-only tools and panels for testing and debugging.
 * This component will not render in production environments.
 */
import React from 'react';
import { isProductionEnvironment } from '../../lib/worldchain/environmentUtils';
import TransactionTestPanel from './TransactionTestPanel';
import './DevelopmentTools.css';

interface DevelopmentToolsProps {
  showBorder?: boolean;
}

const DevelopmentTools: React.FC<DevelopmentToolsProps> = ({ showBorder = true }) => {
  // Don't render in production
  if (isProductionEnvironment()) {
    return null;
  }
  
  return (
    <div className={`development-tools ${showBorder ? 'with-border' : ''}`}>
      <div className="dev-tools-header">
        <h1>Development Tools</h1>
        <div className="dev-environment-indicator">
          DEV MODE
        </div>
      </div>
      
      <TransactionTestPanel />
      
      {/* Additional development tools can be added here */}
    </div>
  );
};

export default DevelopmentTools;
