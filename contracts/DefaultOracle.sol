// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./dependencies/openzeppelin/token/ERC20/extensions/IERC20Metadata.sol";
import "./dependencies/chainlink/interfaces/AggregatorV3Interface.sol";
import "./access/Governable.sol";
import "./interface/IOracle.sol";
import "./interface/IPriceProvider.sol";
import "./lib/OracleHelpers.sol";

/**
 * @title Oracle contract that encapsulates 3rd-party protocols' oracles
 */
contract DefaultOracle is IOracle, Governable {
    address public USDToken;
    /**
     * @notice Get the price provider contract for each protocol
     */
    mapping(Provider => address) public priceProvider;

    constructor(address _USDToken) {
        USDToken = _USDToken;
    }

    function setPriceProvider(Provider _provider, address _priceProvider) external onlyGovernor {
        require(address(_priceProvider) != address(0), "price-provider-address-null");
        priceProvider[_provider] = _priceProvider;
        // TODO: emit event
    }

    function setUSDToken(address _USDToken) external onlyGovernor {
        //Allow to set 0x0 in case we dont want to support it
        USDToken = _USDToken;
    }

    function quote(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        Provider _provider
    ) public view returns (uint256, uint256) {
        require(priceProvider[_provider] != address(0), "invalid-provider");
        return IPriceProvider(priceProvider[_provider]).quote(_assetIn, _assetOut, _amountIn);
    }

    function quoteTokenToUsd(
        address token,
        uint256 _amount,
        Provider _provider
    ) public view returns (uint256 _amountInUsd, uint256 _lastUpdatedAt) {
        require(priceProvider[_provider] != address(0), "invalid-provider");
        if (_provider == Provider.CHAINLINK) {
            return IPriceProvider(priceProvider[_provider]).quoteTokenToUsd(token, _amount);
        }
        uint256 amountOut;
        (amountOut, _lastUpdatedAt) = IPriceProvider(priceProvider[_provider]).quote(token, USDToken, _amount);
        _amountInUsd = OracleHelpers.scaleDecimal(amountOut, IERC20Metadata(USDToken).decimals(), 8);
    }

    function quoteUsdToToken(
        address token,
        uint256 _amountInUsd,
        Provider _provider
    ) public view returns (uint256 _amount, uint256 _lastUpdatedAt) {
        require(priceProvider[_provider] != address(0), "invalid-provider");
        if (_provider == Provider.CHAINLINK) {
            return IPriceProvider(priceProvider[_provider]).quoteUsdToToken(token, _amountInUsd);
        }
        uint256 amountIn = OracleHelpers.scaleDecimal(_amountInUsd, 8, IERC20Metadata(USDToken).decimals());
        (_amount, _lastUpdatedAt) = IPriceProvider(priceProvider[_provider]).quote(USDToken, token, amountIn);
    }
}
