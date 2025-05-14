import styled from 'styled-components';

// Main container for the swap box
export const SwapBoxContainer = styled.div`
  background-color: #151515;
  border-radius: 10px;
  padding: 20px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  margin: 0 auto;
`;

// Title for the swap box
export const SwapBoxTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: #fff;
  text-align: center;
`;

// Container for token input section
export const TokenInputContainer = styled.div`
  background-color: #232323;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .usd-value {
    font-size: 12px;
    color: #999;
    text-align: right;
  }
`;

// Input for token amount
export const AmountInput = styled.input`
  background-color: transparent;
  border: none;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  width: 100%;
  padding: 8px 0;
  text-align: right;
  outline: none;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #666;
  }

  /* Remove number input arrows */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type=number] {
    -moz-appearance: textfield;
  }
`;

// Container for the swap button
export const SwapButtonContainer = styled.div`
  margin-top: 20px;
  width: 100%;
`;

// Container for fee information
export const FeeContainer = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
  margin-top: 12px;
`;

// Container for swap status
export const SwapStatusContainer = styled.div`
  margin-top: 16px;
  min-height: 24px;
  
  .status-message {
    font-size: 14px;
    color: #ffa500;
    text-align: center;
  }
`;

// Component for displaying swap fee info
export const SwapFeeInfo = styled.div`
  background-color: #232323;
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  font-size: 14px;
  color: #ccc;
`;

// Container for the swap direction icon
export const SwapIconContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  margin: -8px 0;
  position: relative;
  z-index: 2;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }

  svg {
    background-color: #1b73e8;
    border-radius: 50%;
    padding: 6px;
    color: white;
    cursor: pointer;
  }
`;

// Container for price information
export const PriceInfoContainer = styled.div`
  background-color: #232323;
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

// Row for price information display
export const PriceRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #ccc;
`;

// Container for slippage settings
export const SlippageContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #ccc;
`;

// Input for slippage value
export const SlippageInput = styled.input`
  background-color: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  padding: 4px 8px;
  width: 60px;
  text-align: right;
  outline: none;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type=number] {
    -moz-appearance: textfield;
  }
`;

// Container for error messages
export const ErrorContainer = styled.div`
  background-color: rgba(255, 59, 59, 0.1);
  border: 1px solid #ff3b3b;
  border-radius: 8px;
  color: #ff3b3b;
  font-size: 14px;
  padding: 12px;
  margin-top: 16px;
  text-align: center;
`;
