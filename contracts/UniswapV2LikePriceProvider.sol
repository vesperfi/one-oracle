// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./dependencies/openzeppelin/utils/math/Math.sol";
import "./dependencies/uniswap/v2-core/interfaces/IUniswapV2Pair.sol";
import "./dependencies/uniswap/lib/libraries/FixedPoint.sol";
import "./dependencies/uniswap/v2-periphery/libraries/UniswapV2OracleLibrary.sol";
import "./dependencies/uniswap/v2-periphery/libraries/UniswapV2Library.sol";
import "./dependencies/uniswap/v2-periphery/interfaces/IUniswapV2Router02.sol";
import "./access/Governable.sol";
import "./interface/IPriceProvider.sol";

/**
 * @title UniswapV2 (and forks) TWAP Oracle implementation
 * Based on https://github.com/Uniswap/v2-periphery/blob/master/contracts/examples/ExampleOracleSimple.sol
 */
contract UniswapV2LikePriceProvider is IPriceProvider, Governable {
    using FixedPoint for *;

    address public immutable factory;
    address public immutable weth;
    /**
     * @notice The time-weighted average price (TWAP) period
     * @dev See more: https://docs.uniswap.org/protocol/concepts/V3-overview/oracle
     */
    uint256 public twapPeriod;

    struct Observation {
        address token0;
        address token1;
        uint256 price0CumulativeLast;
        uint256 price1CumulativeLast;
        uint32 blockTimestampLast;
        FixedPoint.uq112x112 price0Average;
        FixedPoint.uq112x112 price1Average;
    }

    mapping(address => Observation) public observations;

    /// @notice Emitted when TWAP period is updated
    event TwapPeriodUpdated(uint256 oldTwapPeriod, uint256 newTwapPeriod);

    constructor(IUniswapV2Router02 _router, uint256 _twapPeriod) {
        require(address(_router) != address(0), "zero-router-address");
        twapPeriod = _twapPeriod;
        factory = _router.factory();
        weth = _router.WETH();
    }

    /**
     * @notice Update TWAP period
     * @param _newTwapPeriod The new period
     */
    function updateTwapPeriod(uint256 _newTwapPeriod) external onlyGovernor {
        emit TwapPeriodUpdated(twapPeriod, _newTwapPeriod);
        twapPeriod = _newTwapPeriod;
    }

    /**
     * @notice Update cumulative and average price of token0, token1
     * @param _token0 token0
     * @param _token1 token1
     */
    function update(address _token0, address _token1) external {
        address _pair = UniswapV2Library.pairFor(factory, _token0, _token1);
        if (observations[_pair].blockTimestampLast == 0) {
            _addOracleFor(IUniswapV2Pair(_pair));
        }
        _updateIfNeeded(_pair);
    }

    /// @inheritdoc IPriceProvider
    function quote(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        address _pair = UniswapV2Library.pairFor(factory, _assetIn, _assetOut);
        if (_hasOracleData(address(_pair))) {
            (_amountOut, _lastUpdatedAt) = _getAmountOut(_assetIn, _assetOut, _amountIn);
        } else {
            (_amountOut, _lastUpdatedAt) = _getAmountOut(_assetIn, weth, _amountIn);
            uint256 ___lastUpdatedAt_;
            (_amountOut, ___lastUpdatedAt_) = _getAmountOut(weth, _assetOut, _amountOut);
            _lastUpdatedAt = Math.min(___lastUpdatedAt_, _lastUpdatedAt);
        }
    }

    //solhint-disable no-empty-blocks
    function quoteTokenToUsd(address token, uint256 _amount)
        external
        view
        returns (uint256 _amountInUsd, uint256 _lastUpdatedAt)
    {}

    function quoteUsdToToken(address token, uint256 _amountInUsd)
        external
        view
        returns (uint256 _amount, uint256 _lastUpdatedAt)
    {}

    function _addOracleFor(IUniswapV2Pair _pair) private {
        if (_hasOracleData(address(_pair))) return;

        (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) = _pair.getReserves();

        require(_reserve0 != 0 && _reserve1 != 0, "no-reserves");

        observations[address(_pair)] = Observation({
            token0: _pair.token0(),
            token1: _pair.token1(),
            price0CumulativeLast: _pair.price0CumulativeLast(),
            price1CumulativeLast: _pair.price1CumulativeLast(),
            blockTimestampLast: _blockTimestampLast,
            price0Average: uint112(0).encode(),
            price1Average: uint112(0).encode()
        });
    }

    function _getAmountOut(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) private view returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        address _pair = UniswapV2Library.pairFor(factory, _tokenIn, _tokenOut);
        Observation memory _observation = observations[_pair];
        if (_tokenIn == _observation.token0) {
            _amountOut = _observation.price0Average.mul(_amountIn).decode144();
        } else {
            _amountOut = _observation.price1Average.mul(_amountIn).decode144();
        }
        _lastUpdatedAt = _observation.blockTimestampLast;
    }

    function _hasOracleData(address pair) private view returns (bool) {
        return observations[pair].blockTimestampLast != 0;
    }

    function _updateIfNeeded(address _pair) private returns (bool) {
        Observation storage _observation = observations[_pair];

        (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) = UniswapV2OracleLibrary
            .currentCumulativePrices(_pair);
        uint32 timeElapsed = blockTimestamp - _observation.blockTimestampLast; // overflow is desired
        // ensure that at least one full period has passed since the last update
        if (timeElapsed < twapPeriod) return false;

        // overflow is desired, casting never truncates
        // cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
        _observation.price0Average = FixedPoint.uq112x112(
            uint224((price0Cumulative - _observation.price0CumulativeLast) / timeElapsed)
        );
        _observation.price1Average = FixedPoint.uq112x112(
            uint224((price1Cumulative - _observation.price1CumulativeLast) / timeElapsed)
        );
        _observation.price0CumulativeLast = price0Cumulative;
        _observation.price1CumulativeLast = price1Cumulative;
        _observation.blockTimestampLast = blockTimestamp;
        return true;
    }
}
