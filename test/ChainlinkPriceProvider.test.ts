/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
import {parseEther, parseUnits} from '@ethersproject/units'
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkPriceProvider, ChainlinkPriceProvider__factory} from '../../typechain'
import {
  CHAINLINK_DOGE_AGGREGATOR_ADDRESS,
  CHAINLINK_BTC_AGGREGATOR_ADDRESS,
  CHAINLINK_ETH_AGGREGATOR_ADDRESS,
  enableForking,
  disableForking,
} from './helpers'

const abi = new ethers.utils.AbiCoder()

describe('ChainlinkPriceProvider', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: ChainlinkPriceProvider
  let assetData: string

  before(enableForking)

  after(disableForking)

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const priceProviderFactory = new ChainlinkPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('DOGE oracle ', function () {
    beforeEach(async function () {
      assetData = abi.encode(['address', 'uint256'], [CHAINLINK_DOGE_AGGREGATOR_ADDRESS, 18])
    })

    it('convertToUsd', async function () {
      const {_amountInUsd} = await priceProvider.convertToUsd(assetData, parseEther('1'))
      expect(_amountInUsd).eq('24128635')
    })

    it('convertFromUsd', async function () {
      const {_amount} = await priceProvider.convertFromUsd(assetData, '24128635')
      expect(_amount).eq(parseEther('1'))
    })
  })

  describe('BTC oracle ', function () {
    beforeEach(async function () {
      assetData = abi.encode(['address', 'uint256'], [CHAINLINK_BTC_AGGREGATOR_ADDRESS, 8])
    })

    it('convertToUsd', async function () {
      const {_amountInUsd} = await priceProvider.convertToUsd(assetData, parseUnits('1', 8))
      expect(_amountInUsd).eq('5024100000000')
    })

    it('convertFromUsd', async function () {
      const {_amount} = await priceProvider.convertFromUsd(assetData, '5024100000000')
      expect(_amount).eq(parseUnits('1', 8))
    })
  })

  describe('ETH oracle ', function () {
    beforeEach(async function () {
      assetData = abi.encode(['address', 'uint256'], [CHAINLINK_ETH_AGGREGATOR_ADDRESS, 18])
    })

    it('convertToUsd', async function () {
      const {_amountInUsd} = await priceProvider.convertToUsd(assetData, parseEther('1'))
      expect(_amountInUsd).eq('346104760640')
    })

    it('convertFromUsd', async function () {
      const {_amount} = await priceProvider.convertFromUsd(assetData, '346104760640')
      expect(_amount).eq(parseEther('1'))
    })
  })

  describe('convert', function () {
    it('should get Token->Token price', async function () {
      const tokenIn = abi.encode(['address', 'uint256'], [CHAINLINK_BTC_AGGREGATOR_ADDRESS, 8])
      const tokenOut = abi.encode(['address', 'uint256'], [CHAINLINK_ETH_AGGREGATOR_ADDRESS, 18])
      const amountIn = parseUnits('1', 8) // 1 BTC
      const {_amountOut} = await priceProvider.convert(tokenIn, tokenOut, amountIn)

      // @ts-ignore
      expect(_amountOut).closeTo(parseEther('14.5'), parseEther('0.05'))
    })
  })
})
