/**
 * World Chain Debugger Component
 * Initializes diagnostic tools and provides debug UI
 */

import React, { useEffect, useState } from 'react';
import { initializeWorldChainDebugging, WorldLogger } from '../../lib/worldchain/debug';

interface WorldChainDebuggerProps {
  enabled?: boolean;
}

const WorldChainDebugger: React.FC<WorldChainDebuggerProps> = ({ enabled = true }) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  useEffect(() => {
    if (!enabled) return;
    
    try {
      // Initialize debugging tools
      initializeWorldChainDebugging();
      setIsInitialized(true);
      
      WorldLogger.info('World Chain Debugger component mounted');
      
      // Log page URL on navigation
      const handleNavigation = (): void => {
        WorldLogger.debug(`Page navigation: ${window.location.pathname}`);
      };
      
      window.addEventListener('popstate', handleNavigation);
      
      return () => {
        window.removeEventListener('popstate', handleNavigation);
        WorldLogger.info('World Chain Debugger component unmounted');
      };
    } catch (error) {
      console.error('Failed to initialize World Chain Debugger:', error);
    }
  }, [enabled]);
  
  // This component doesn't render anything visible
  return null;
};

export default WorldChainDebugger;
