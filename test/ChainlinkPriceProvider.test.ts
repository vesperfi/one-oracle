/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
import {parseEther} from '@ethersproject/units'
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkPriceProvider, ChainlinkPriceProvider__factory} from '../typechain'
import {enableForking, disableForking} from './helpers'
import Address from '../helpers/address'
const {WETH_ADDRESS, WBTC_ADDRESS, DAI_ADDRESS, CHAINLINK_PRICE_FEED} = Address

describe('ChainlinkPriceProvider', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: ChainlinkPriceProvider
  const TEN_THOUSANDS_USD = 1000000000000 // USD price in 8 decimal places.

  before(enableForking)

  after(disableForking)

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const priceProviderFactory = new ChainlinkPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy(CHAINLINK_PRICE_FEED, WETH_ADDRESS, WBTC_ADDRESS)
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('convert', function () {
    const ONE_WBTC = 100000000
    it('Should convert same token to same token', async function () {
      const amountIn = parseEther('100')
      const {_amountOut} = await priceProvider.quote(WETH_ADDRESS, WETH_ADDRESS, amountIn)
      expect(_amountOut).to.be.equal(amountIn, 'Amount out is wrong')
    })

    it('Should get WETH token price in USD', async function () {
      const {_amountInUsd} = await priceProvider.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'))
      expect(_amountInUsd).eq('346104760640')
    })

    it('Should get WBTC token price in USD', async function () {
      const {_amountInUsd} = await priceProvider.quoteTokenToUsd(WBTC_ADDRESS, ONE_WBTC)
      expect(_amountInUsd).eq('5024100000000')
    })

    it('Should get WBTC token price in WETh', async function () {
      const {_amountOut} = await priceProvider.quote(WBTC_ADDRESS, WETH_ADDRESS, ONE_WBTC)
      expect(_amountOut).eq('14516125090881962853')
    })

    it('Should get DAI token price in USD', async function () {
      const {_amountInUsd} = await priceProvider.quoteTokenToUsd(DAI_ADDRESS, parseEther('1'))
      expect(_amountInUsd).eq('100005441')
    })

    it('Should get USD to WETH token quote ', async function () {
      const {_amount} = await priceProvider.quoteUsdToToken(WETH_ADDRESS, TEN_THOUSANDS_USD)
      expect(_amount).eq('2889298598929552129')
    })

    it('Should get USD to WBTC token quote', async function () {
      const {_amount} = await priceProvider.quoteUsdToToken(WBTC_ADDRESS, TEN_THOUSANDS_USD)
      expect(_amount).eq('19904062')
    })

    it('Should get USD to DAI token quote', async function () {
      const {_amount} = await priceProvider.quoteUsdToToken(DAI_ADDRESS, TEN_THOUSANDS_USD)
      expect(_amount).eq('9999455929602870307826')
    })
  })
})
