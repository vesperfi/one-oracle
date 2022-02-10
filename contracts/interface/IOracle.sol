// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../dependencies/openzeppelin/token/ERC20/IERC20.sol";
import "./IPriceProvider.sol";

enum Provider {
    NONE,
    UNISWAP_V3,
    UNISWAP_V2,
    CHAINLINK
}

interface IOracle {
    function quote(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        Provider _provider
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    function quoteTokenToUsd(
        address token,
        uint256 _amount,
        Provider _provider
    ) external view returns (uint256 _amountInUsd, uint256 _lastUpdatedAt);

    function quoteUsdToToken(
        address token,
        uint256 _amountInUsd,
        Provider _provider
    ) external view returns (uint256 _amount, uint256 _lastUpdatedAt);
}
