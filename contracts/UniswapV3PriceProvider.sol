// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./access/Governable.sol";
import "./interface/IUniswapV3CrossPoolOracle.sol";
import "./interface/IPriceProvider.sol";

contract UniswapV3PriceProvider is IPriceProvider, Governable {
    /**
     * @notice The UniswapV3CrossPoolOracle contract address
     * @dev This is 3rd-party non-upgradable contract
     * @dev The address isn't hardcoded because we may want to deploy to other chains
     * See more: https://etherscan.io/address/0x0f1f5a87f99f0918e6c81f16e59f3518698221ff#code
     */
    IUniswapV3CrossPoolOracle public crossPoolOracle;

    /**
     * @notice The time-weighted average price (TWAP) period
     * @dev See more: https://docs.uniswap.org/protocol/concepts/V3-overview/oracle
     */
    uint32 public twapPeriod;

    /// @notice Emitted when TWAP period is updated
    event TwapPeriodUpdated(uint32 oldTwapPeriod, uint32 newTwapPeriod);

    constructor(IUniswapV3CrossPoolOracle _crossPoolOracle, uint32 _twapPeriod) {
        require(address(_crossPoolOracle) != address(0), "zero-cross0pool-oracle-address");
        crossPoolOracle = _crossPoolOracle;
        twapPeriod = _twapPeriod;
    }

    /**
     * @notice Update TWAP period
     * @param _newTwapPeriod The new period
     */
    function updateTwapPeriod(uint32 _newTwapPeriod) public onlyGovernor {
        emit TwapPeriodUpdated(twapPeriod, _newTwapPeriod);
        twapPeriod = _newTwapPeriod;
    }

    /// @inheritdoc IPriceProvider
    function quote(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) public view returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        _amountOut = crossPoolOracle.assetToAsset(_tokenIn, _amountIn, _tokenOut, twapPeriod);
        _lastUpdatedAt = block.timestamp;
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
}
