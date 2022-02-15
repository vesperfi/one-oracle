// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

// List of supported price providers
enum Provider {
    NONE,
    UNISWAP_V3,
    UNISWAP_V2,
    CHAINLINK
}

interface IOracle {
    /**
     * @notice Get quote
     * @param _tokenIn The address of assetIn
     * @param _tokenOut The address of assetOut
     * @param _amountIn Amount of input token
     * @param _provider Price provider
     * @return _amountOut Amount out
     * @return _lastUpdatedAt Timestamp when price was last updated
     */
    function quote(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        Provider _provider
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote in USD amount
     * @param _token The address of assetIn
     * @param _amount Amount of input token.
     * @param _provider Price provider
     * @return _amountInUsd Amount in USD
     * @return _lastUpdatedAt Timestamp when price was last updated
     */
    function quoteTokenToUsd(
        address _token,
        uint256 _amount,
        Provider _provider
    ) external view returns (uint256 _amountInUsd, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote from USD amount to amount of token
     * @param _token The address of assetIn
     * @param _amountInUsd Input amount in USD
     * @param _provider Price provider
     * @return _amount Output amount of token
     * @return _lastUpdatedAt Timestamp when price was last updated
     */
    function quoteUsdToToken(
        address _token,
        uint256 _amountInUsd,
        Provider _provider
    ) external view returns (uint256 _amount, uint256 _lastUpdatedAt);
}
