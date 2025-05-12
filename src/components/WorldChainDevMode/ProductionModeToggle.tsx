import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { shouldUseProductionMode } from "lib/worldchain/worldChainProduction";

const ToggleContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 15px;
  border-radius: 8px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 300px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  gap: 8px;
`;

const ToggleSwitch = styled.div<{ isOn: boolean }>`
  position: relative;
  width: 50px;
  height: 24px;
  background-color: ${(props) => (props.isOn ? "#4cd964" : "#ccc")};
  border-radius: 12px;
  transition: background-color 0.2s;

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${(props) => (props.isOn ? "28px" : "2px")};
    width: 20px;
    height: 20px;
    background-color: white;
    border-radius: 50%;
    transition: left 0.2s;
  }
`;

const ModeInfo = styled.div`
  font-size: 0.8rem;
  opacity: 0.9;
`;

/**
 * A toggle switch that allows switching between development and production modes
 * Only visible in development builds
 */
const ProductionModeToggle: React.FC = () => {
  const [isProduction, setIsProduction] = useState(shouldUseProductionMode());
  const [showToggle, setShowToggle] = useState(false);

  useEffect(() => {
    // Only show the toggle in development mode
    if (import.meta.env.DEV) {
      setShowToggle(true);
    }
  }, []);

  const toggleMode = () => {
    const newMode = !isProduction;
    setIsProduction(newMode);
    
    // Store the preference for page refreshes
    localStorage.setItem("worldchain_use_production", newMode ? "true" : "false");
    
    // Reload to apply changes
    window.location.reload();
  };

  if (!showToggle) {
    return null;
  }

  return (
    <ToggleContainer>
      <ToggleLabel onClick={toggleMode}>
        <ToggleSwitch isOn={isProduction} />
        <span>{isProduction ? "Production Mode" : "Development Mode"}</span>
      </ToggleLabel>
      <ModeInfo>
        {isProduction
          ? "Using real contract addresses and price feeds"
          : "Using mock data and development contracts"}
      </ModeInfo>
    </ToggleContainer>
  );
};

export default ProductionModeToggle;
