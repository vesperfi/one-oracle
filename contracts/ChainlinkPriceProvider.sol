// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./dependencies/openzeppelin/utils/math/Math.sol";
import "./dependencies/openzeppelin/utils/math/SafeCast.sol";
import "./dependencies/chainlink/interfaces/AggregatorV3Interface.sol";
import "./interface/IPriceProvider.sol";
import "./dependencies/openzeppelin/token/ERC20/extensions/IERC20Metadata.sol";
import "./access/Governable.sol";

/**
 * @title ChainLink's price provider
 * @dev This contract wraps chainlink aggregators
 */
contract ChainlinkPriceProvider is IPriceProvider, Governable {

    mapping(address => address) public aggregators;

    function addOrUpdateAsset(address _token, address _aggregator) external onlyGovernor {
        require(address(_aggregator) != address(0), "aggregator-address-is-null");
        aggregators[_token] = _aggregator;
    }

    function quote(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn
    ) public view returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        (uint256 _amountInUsd, uint256 _lastUpdatedAt0) = quoteTokenToUsd(_assetIn, _amountIn);
        (_amountOut, _lastUpdatedAt) = quoteUsdToToken(_assetOut, _amountInUsd);
        _lastUpdatedAt = Math.min(_lastUpdatedAt0, _lastUpdatedAt);
    }

    function quoteTokenToUsd(address token, uint256 _amount)
        public
        view
        returns (uint256 _amountInUsd, uint256 _lastUpdatedAt)
    {
        uint256 _price;
        (_price, _lastUpdatedAt) = _getPriceOfAsset(aggregators[token]);
        _amountInUsd = (_amount * _price) / 10**IERC20Metadata(token).decimals();
    }

    function quoteUsdToToken(address token, uint256 _amountInUsd)
        public
        view
        returns (uint256 _amount, uint256 _lastUpdatedAt)
    {
        uint256 _price;
        (_price, _lastUpdatedAt) = _getPriceOfAsset(aggregators[token]);
        _amount = (_amountInUsd * 10**IERC20Metadata(token).decimals()) / _price;
    }

    /**
     * @notice Get price from an aggregator
     * @param _aggregator The aggregator contract address
     * @return The price and its timestamp
     */
    function _getPriceOfAsset(address _aggregator) private view returns (uint256, uint256) {
        (, int256 _price, , uint256 _lastUpdatedAt, ) = AggregatorV3Interface(_aggregator).latestRoundData();
        return (SafeCast.toUint256(_price), _lastUpdatedAt);
    }
}
