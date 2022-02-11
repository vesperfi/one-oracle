// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./dependencies/openzeppelin/token/ERC20/extensions/IERC20Metadata.sol";
import "./interface/IPriceProvider.sol";
import "./access/Governable.sol";
import "./interface/IOracle.sol";
import "./lib/OracleHelpers.sol";

/**
 * @title Oracle contract that encapsulates 3rd-party oracles.
 */
contract DefaultOracle is IOracle, Governable {
    address public usdToken;
   
    mapping(Provider => address) public priceProvider;

    event PriceProvideUpdated(Provider _provider, address _oldPriceProvider, address _newPriceProvider);

    /**
     * @notice Set address of price provider
     * @param _provider Provider
     * @param _priceProvider Address of provider
     */
    function setPriceProvider(Provider _provider, address _priceProvider) external onlyGovernor {
        require(address(_priceProvider) != address(0), "price-provider-address-zero");
        emit PriceProvideUpdated(_provider, priceProvider[_provider], _priceProvider);
        priceProvider[_provider] = _priceProvider;
    }

    /**
     * @notice For Dex price provider, we may want to use stable token as USD token to get price in USD
     * @dev Allow to set 0x0 in case we don't want to support USD price from UNI2 and UNI3.
     * @param _usdToken Preferred stable token address
     */
    function setUSDToken(address _usdToken) external onlyGovernor {
        usdToken = _usdToken;
    }

    /// @inheritdoc IOracle
    function quote(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        Provider _provider
    ) public view returns (uint256, uint256) {
        require(priceProvider[_provider] != address(0), "invalid-provider");
        return IPriceProvider(priceProvider[_provider]).quote(_assetIn, _assetOut, _amountIn);
    }

    /// @inheritdoc IOracle
    function quoteTokenToUsd(
        address token,
        uint256 _amount,
        Provider _provider
    ) public view returns (uint256 _amountInUsd, uint256 _lastUpdatedAt) {
        require(priceProvider[_provider] != address(0), "invalid-provider");
        if (_provider == Provider.CHAINLINK) {
            return IPriceProvider(priceProvider[_provider]).quoteTokenToUsd(token, _amount);
        }
        require(usdToken != address(0), "not-supported");
        uint256 amountOut;
        (amountOut, _lastUpdatedAt) = IPriceProvider(priceProvider[_provider]).quote(token, usdToken, _amount);
        _amountInUsd = OracleHelpers.scaleDecimal(amountOut, IERC20Metadata(usdToken).decimals(), 8);
    }

    /// @inheritdoc IOracle
    function quoteUsdToToken(
        address token,
        uint256 _amountInUsd,
        Provider _provider
    ) public view returns (uint256 _amount, uint256 _lastUpdatedAt) {
        require(priceProvider[_provider] != address(0), "invalid-provider");
        if (_provider == Provider.CHAINLINK) {
            return IPriceProvider(priceProvider[_provider]).quoteUsdToToken(token, _amountInUsd);
        }
        require(usdToken != address(0), "not-supported");
        uint256 amountIn = OracleHelpers.scaleDecimal(_amountInUsd, 8, IERC20Metadata(usdToken).decimals());
        (_amount, _lastUpdatedAt) = IPriceProvider(priceProvider[_provider]).quote(usdToken, token, amountIn);
    }
}
