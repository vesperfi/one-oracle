/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
import { parseEther } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import {BigNumber} from '@ethersproject/bignumber'
import {
  Oracle,
  Oracle__factory,
  UniswapV3PriceProvider__factory,
  UniswapV3PriceProvider,
  UniswapV2LikePriceProvider__factory,
  UniswapV2LikePriceProvider,
  ChainlinkPriceProvider,
  ChainlinkPriceProvider__factory,
} from '../typechain'
import {
  DEFAULT_TWAP_PERIOD,
  enableForking,
  disableForking,
  increaseTime,
} from './helpers'
import Address from '../helpers/address'

const {
  DAI_ADDRESS,
  USDC_ADDRESS,
  WBTC_ADDRESS,
  UNISWAP_V3_CROSS_POOL_ORACLE_ADDRESS,
  WETH_ADDRESS,
  CHAINLINK_PRICE_FEED,
  UNISWAP_V2_ROUTER02_ADDRESS } = Address

const { AddressZero } = ethers.constants
const TEN_THOUSANDS_USD = 1000000000000 // USD price in 8 decimal places.

const Protocol = {
  NONE: 0,
  UNISWAP_V3: 1,
  UNISWAP_V2: 2,
  CHAINLINK: 3,
}

describe('Oracle', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let user: SignerWithAddress
  let oracle: Oracle
  let chainlinkPriceProvider: ChainlinkPriceProvider
  let uniswapV2LikePriceProvider: UniswapV2LikePriceProvider
  let uniswapV3PriceProvider: UniswapV3PriceProvider

  before(enableForking)

  after(disableForking)

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
      ;[deployer, user] = await ethers.getSigners()

    // UniswapV3
    const uniswapV3PriceProviderFactory = new UniswapV3PriceProvider__factory(deployer)
    uniswapV3PriceProvider = await uniswapV3PriceProviderFactory.deploy(
      UNISWAP_V3_CROSS_POOL_ORACLE_ADDRESS,
      DEFAULT_TWAP_PERIOD
    )
    await uniswapV3PriceProvider.deployed()

    // Uniswap V2
    const UniswapV2LikePriceProviderFactory = new UniswapV2LikePriceProvider__factory(deployer)
    uniswapV2LikePriceProvider = await UniswapV2LikePriceProviderFactory.deploy(
      UNISWAP_V2_ROUTER02_ADDRESS,
      DEFAULT_TWAP_PERIOD
    )
    await uniswapV2LikePriceProvider.deployed()

    // Chainlink
    const priceProviderFactory = new ChainlinkPriceProvider__factory(deployer)
    chainlinkPriceProvider = await priceProviderFactory.deploy(CHAINLINK_PRICE_FEED, WETH_ADDRESS, WBTC_ADDRESS)
    await chainlinkPriceProvider.deployed()

    // Oracle
    const oracleFactory = new Oracle__factory(deployer)
    oracle = await oracleFactory.deploy()
    await oracle.deployed()

    await oracle.setPriceProvider(Protocol.UNISWAP_V3, uniswapV3PriceProvider.address)
    await oracle.setPriceProvider(Protocol.UNISWAP_V2, uniswapV2LikePriceProvider.address)
    await oracle.setPriceProvider(Protocol.CHAINLINK, chainlinkPriceProvider.address)

    await oracle.setUSDEquivalentToken(USDC_ADDRESS)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('using latest price (view) functions', function () {
    describe('quote DAI token to USD', function () {
      it('should quote to USD using UniswapV3 price provider', async function () {
        const { _amountInUsd } = await oracle.quoteTokenToUsd(DAI_ADDRESS, parseEther('100'), Protocol.UNISWAP_V3)
        expect(_amountInUsd).eq('10005027400')
      })

      it('should quote DAI to USD using UniswapV2 price provider', async function () {
        const twoHour = DEFAULT_TWAP_PERIOD
        await oracle.setUSDEquivalentToken(USDC_ADDRESS)
        await uniswapV2LikePriceProvider.update(USDC_ADDRESS, DAI_ADDRESS)
        await uniswapV2LikePriceProvider.update(WETH_ADDRESS, DAI_ADDRESS)
        await uniswapV2LikePriceProvider.update(WETH_ADDRESS, USDC_ADDRESS)
        await increaseTime(twoHour.mul('12'))
        await uniswapV2LikePriceProvider.update(WETH_ADDRESS, USDC_ADDRESS)
        await increaseTime(twoHour.mul('12'))
        await uniswapV2LikePriceProvider.update(USDC_ADDRESS, DAI_ADDRESS)
        await uniswapV2LikePriceProvider.update(WETH_ADDRESS, DAI_ADDRESS)
        await uniswapV2LikePriceProvider.update(WETH_ADDRESS, USDC_ADDRESS)
        const { _amountInUsd } = await oracle.quoteTokenToUsd(DAI_ADDRESS, parseEther('100'), Protocol.UNISWAP_V2)
        expect(_amountInUsd).eq('9985130000')
      })

      it('should quote WETH to USD using UniswapV2 price provider', async function () {
        await oracle.setUSDEquivalentToken(USDC_ADDRESS)
        await uniswapV2LikePriceProvider.update(WETH_ADDRESS, DAI_ADDRESS)
        await uniswapV2LikePriceProvider.update(WETH_ADDRESS, USDC_ADDRESS)
        await increaseTime(DEFAULT_TWAP_PERIOD)
        await uniswapV2LikePriceProvider.update(WETH_ADDRESS, DAI_ADDRESS)
        await uniswapV2LikePriceProvider.update(WETH_ADDRESS, USDC_ADDRESS)
        const { _amountInUsd } = await oracle.quoteTokenToUsd(WETH_ADDRESS, parseEther('100'), Protocol.UNISWAP_V2)
        expect(_amountInUsd).eq('34625762930300')
      })

      it('should quote to USD using Chainlink price provider', async function () {
        const { _amountInUsd } = await oracle.quoteTokenToUsd(DAI_ADDRESS, parseEther('100'), Protocol.CHAINLINK)
        expect(_amountInUsd).eq('10000544100')
      })
    })

    describe('quote WETH token to USD', function () {
      it('should quote to USD using UniswapV3 price provider', async function () {
        const { _amountInUsd } = await oracle.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'), Protocol.UNISWAP_V3)
        expect(_amountInUsd).eq('344815771200')
      })

      it('should quote to USD using Chainlink price provider', async function () {
        const { _amountInUsd } = await oracle.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'), Protocol.CHAINLINK)
        expect(_amountInUsd).eq('346104760640')
      })
    })

    describe('quote WBTC token to USD', function () {
      it('should quote to USD using UniswapV3 price provider', async function () {
        const { _amountInUsd } = await oracle.quoteTokenToUsd(WBTC_ADDRESS, 100000000, Protocol.UNISWAP_V3)
        expect(_amountInUsd).eq('5005408534500')
      })

      it('should quote to USD using Chainlink price provider', async function () {
        const { _amountInUsd } = await oracle.quoteTokenToUsd(WBTC_ADDRESS, 100000000, Protocol.CHAINLINK)
        expect(_amountInUsd).eq('5024100000000')
      })
    })

    describe('Quote USD to WETH', function () {
      it('should quote to USD using UniswapV3 price provider', async function () {
        const { _amount } = await oracle.quoteUsdToToken(WETH_ADDRESS, TEN_THOUSANDS_USD, Protocol.UNISWAP_V3)
        expect(_amount).eq('2900099367316856158')
      })

      it('should quote to USD using Chainlink price provider', async function () {
        const { _amount } = await oracle.quoteUsdToToken(WETH_ADDRESS, TEN_THOUSANDS_USD, Protocol.CHAINLINK)
        expect(_amount).eq('2889298598929552129')
      })
    })
  })

  describe('setPriceProvider', function () {
    it('should revert if not governor', async function () {
      const tx = oracle.connect(user).setPriceProvider(Protocol.CHAINLINK, deployer.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if address is null', async function () {
      const tx = oracle.setPriceProvider(Protocol.CHAINLINK, AddressZero)
      await expect(tx).revertedWith('price-provider-address-zero')
    })

  })
})
