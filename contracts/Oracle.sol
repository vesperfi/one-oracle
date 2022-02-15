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
contract Oracle is IOracle, Governable {
    address public usdEquivalentToken;

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
     * @notice For Dex price provider, we may want to use stable token as USD token to get price in USD.
     * @dev Allow to set 0x0 in case we don't want to support USD price from UNI2 and UNI3.
     * @param _usdEquivalentToken Preferred stable token address
     */
    function setUSDEquivalentToken(address _usdEquivalentToken) external onlyGovernor {
        usdEquivalentToken = _usdEquivalentToken;
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

    /// This method internally get quote using stable coin like DAI, USDC, USDT if provider is UNI2 or UNI3. 
    /// Stable coin may lose pegging on-chain and may not be equal to $1.
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
        require(usdEquivalentToken != address(0), "not-supported");
        uint256 amountOut;
        if (usdEquivalentToken != token) {
            (amountOut, _lastUpdatedAt) = IPriceProvider(priceProvider[_provider]).quote(token, usdEquivalentToken, _amount);
        } else {
            amountOut = _amount;
            _lastUpdatedAt = block.timestamp;
        }
        // USD amount is 8 decimal
        _amountInUsd = OracleHelpers.scaleDecimal(amountOut, IERC20Metadata(usdEquivalentToken).decimals(), 8);
    }

    /// This method internally get quote using stable coin like DAI, USDC, USDT if provider is UNI2 or UNI3. 
    /// Stable coin may lose pegging on-chain and may not be equal to $1.
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
        require(usdEquivalentToken != address(0), "not-supported");
        // USD amount is 8 decimal
        uint256 amountIn = OracleHelpers.scaleDecimal(_amountInUsd, 8, IERC20Metadata(usdEquivalentToken).decimals());
        if (usdEquivalentToken != token) {
            (_amount, _lastUpdatedAt) = IPriceProvider(priceProvider[_provider]).quote(usdEquivalentToken, token, amountIn);
        } else {
            _amount = amountIn;
            _lastUpdatedAt = block.timestamp;
        }
    }
}
