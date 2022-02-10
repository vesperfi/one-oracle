// SPDX-License-Identifier: MIT

import "../dependencies/openzeppelin/token/ERC20/IERC20.sol";

pragma solidity 0.8.9;

interface IPriceProvider {
    function quote(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    function quoteTokenToUsd(address token, uint256 _amount)
        external
        view
        returns (uint256 _amountInUsd, uint256 _lastUpdatedAt);

    function quoteUsdToToken(address token, uint256 _amountInUsd)
        external
        view
        returns (uint256 _amount, uint256 _lastUpdatedAt);
}
