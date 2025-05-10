// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@redstone-finance/evm-connector/contracts/data-services/RedstoneConsumerBase.sol";

/**
 * @title RedStonePriceFeed
 * @dev Contract for getting price data from RedStone oracles
 * This contract is used by GMX to get price data for trading on World Chain
 */
contract RedStonePriceFeed is RedstoneConsumerBase {
    // Mapping from token symbol to price decimal places
    mapping(string => uint8) public tokenDecimals;
    
    // Authorized updaters who can modify token configurations
    mapping(address => bool) public authorizedUpdaters;
    
    // Owner address
    address public owner;
    
    // Events
    event TokenDecimalsUpdated(string symbol, uint8 decimals);
    event AuthorizedUpdaterAdded(address updater);
    event AuthorizedUpdaterRemoved(address updater);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    /**
     * @dev Constructor
     */
    constructor() {
        owner = msg.sender;
        authorizedUpdaters[msg.sender] = true;
        
        // Set up default token decimals
        tokenDecimals["WLD"] = 8;
        tokenDecimals["ETH"] = 8;
        tokenDecimals["BTC"] = 8;
        tokenDecimals["USDC"] = 8;
        tokenDecimals["USDT"] = 8;
    }
    
    /**
     * @dev Modifier to restrict function access to owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }
    
    /**
     * @dev Modifier to restrict function access to authorized updaters
     */
    modifier onlyAuthorizedUpdater() {
        require(authorizedUpdaters[msg.sender], "Caller is not authorized");
        _;
    }
    
    /**
     * @dev Transfer ownership to a new address
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    /**
     * @dev Add a new authorized updater
     * @param updater The address to authorize
     */
    function addAuthorizedUpdater(address updater) public onlyOwner {
        require(updater != address(0), "Updater cannot be the zero address");
        authorizedUpdaters[updater] = true;
        emit AuthorizedUpdaterAdded(updater);
    }
    
    /**
     * @dev Remove an authorized updater
     * @param updater The address to remove authorization from
     */
    function removeAuthorizedUpdater(address updater) public onlyOwner {
        require(updater != owner, "Cannot remove owner as updater");
        authorizedUpdaters[updater] = false;
        emit AuthorizedUpdaterRemoved(updater);
    }
    
    /**
     * @dev Set decimals for a token
     * @param symbol The token symbol
     * @param decimals The number of decimal places
     */
    function setTokenDecimals(string calldata symbol, uint8 decimals) public onlyAuthorizedUpdater {
        tokenDecimals[symbol] = decimals;
        emit TokenDecimalsUpdated(symbol, decimals);
    }
    
    /**
     * @dev Get latest token price
     * @param symbol The token symbol
     * @return The token price with 8 decimals
     */
    function getLatestPrice(string calldata symbol) public view returns (uint256) {
        // Get raw price from RedStone oracle
        uint256 price = getOracleNumericValueFromTxMsg(symbol);
        
        // Make adjustments if needed based on token decimals
        uint8 decimals = tokenDecimals[symbol];
        if (decimals == 0) {
            decimals = 8; // Default to 8 decimals if not specified
        }
        
        return price;
    }
    
    /**
     * @dev Get latest prices for multiple tokens
     * @param symbols Array of token symbols
     * @return Array of prices with 8 decimals
     */
    function getLatestPrices(string[] calldata symbols) public view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](symbols.length);
        
        for (uint256 i = 0; i < symbols.length; i++) {
            prices[i] = getLatestPrice(symbols[i]);
        }
        
        return prices;
    }
}
