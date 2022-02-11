// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./dependencies/openzeppelin/utils/math/Math.sol";
import "./dependencies/openzeppelin/utils/math/SafeCast.sol";
import "./dependencies/chainlink/interfaces/FeedRegistryInterface.sol";
import "./interface/IPriceProvider.sol";
import "./dependencies/openzeppelin/token/ERC20/extensions/IERC20Metadata.sol";
import "./access/Governable.sol";

/**
 * @title ChainLink's price provider
 * @dev This contract wraps chainlink price feed
 */
contract ChainlinkPriceProvider is IPriceProvider, Governable {
    // chainlink follows https://en.wikipedia.org/wiki/ISO_4217
    address public constant USD = address(840);
    FeedRegistryInterface public immutable priceFeed;

    constructor(FeedRegistryInterface _priceFeed) {
        require(address(_priceFeed) != address(0), "zero-feed-address");
        priceFeed = _priceFeed;
    }

    /// @inheritdoc IPriceProvider
    function quote(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn
    ) public view returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        (uint256 _amountInUsd, uint256 _lastUpdatedAt0) = quoteTokenToUsd(_assetIn, _amountIn);
        (_amountOut, _lastUpdatedAt) = quoteUsdToToken(_assetOut, _amountInUsd);
        _lastUpdatedAt = Math.min(_lastUpdatedAt0, _lastUpdatedAt);
    }

    /// @inheritdoc IPriceProvider
    function quoteTokenToUsd(address _token, uint256 _amount)
        public
        view
        returns (uint256 _amountInUsd, uint256 _lastUpdatedAt)
    {
        uint256 _price;
        (_price, _lastUpdatedAt) = _getPriceOfAsset(_token);
        _amountInUsd = (_amount * _price) / 10**IERC20Metadata(_token).decimals();
    }

    /// @inheritdoc IPriceProvider
    function quoteUsdToToken(address _token, uint256 _amountInUsd)
        public
        view
        returns (uint256 _amount, uint256 _lastUpdatedAt)
    {
        uint256 _price;
        (_price, _lastUpdatedAt) = _getPriceOfAsset(_token);
        _amount = (_amountInUsd * 10**IERC20Metadata(_token).decimals()) / _price;
    }

    function _getPriceOfAsset(address _token) private view returns (uint256, uint256) {
        (, int256 _price, , uint256 _lastUpdatedAt, ) = priceFeed.latestRoundData(_token, USD);
        return (SafeCast.toUint256(_price), _lastUpdatedAt);
    }
}
