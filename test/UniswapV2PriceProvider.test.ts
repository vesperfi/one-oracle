/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
import {parseEther} from '@ethersproject/units'
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UniswapV2LikePriceProvider__factory, UniswapV2LikePriceProvider} from '../typechain'
import {DEFAULT_TWAP_PERIOD, enableForking, disableForking, increaseTime} from './helpers'
import Address from '../helpers/address'

const {DAI_ADDRESS, USDC_ADDRESS, WETH_ADDRESS, UNISWAP_V2_ROUTER02_ADDRESS} = Address

describe('UniswapV2 price provider', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: UniswapV2LikePriceProvider

  before(enableForking)

  after(disableForking)

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    // Uniswap V2
    const UniswapV2LikePriceProviderFactory = new UniswapV2LikePriceProvider__factory(deployer)
    priceProvider = await UniswapV2LikePriceProviderFactory.deploy(
      UNISWAP_V2_ROUTER02_ADDRESS,
      DEFAULT_TWAP_PERIOD
    )
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('update', function () {
    describe('when usdc token price is updated', function () {
      // usdc-dai pair
      const daiUsdcPair = '0xae461ca67b15dc8dc81ce7615e0320da1a9ab8d5'

      it('should add oracle data if does not exist', async function () {
        const {blockTimestampLast, token0} = await priceProvider.observations(daiUsdcPair)
        expect(blockTimestampLast).eq(0)
        expect(token0).eq(ethers.constants.AddressZero)
        await priceProvider.update(DAI_ADDRESS, USDC_ADDRESS)
        const oracleData = await priceProvider.observations(daiUsdcPair)
        expect(oracleData.blockTimestampLast).not.eq(0)
        expect(oracleData.token0).not.eq(ethers.constants.AddressZero)
      })

      it('should update oracle data ', async function () {
        await priceProvider.update(DAI_ADDRESS, USDC_ADDRESS)
        const oracleDataBefore = await priceProvider.observations(daiUsdcPair)
        await increaseTime(DEFAULT_TWAP_PERIOD)
        await priceProvider.update(DAI_ADDRESS, USDC_ADDRESS)
        const oracleDataAfter = await priceProvider.observations(daiUsdcPair)
        expect(oracleDataAfter.blockTimestampLast).gt(oracleDataBefore.blockTimestampLast)
        const {timestamp} = await ethers.provider.getBlock('latest')
        expect(oracleDataAfter.blockTimestampLast).eq(timestamp)
      })
    })
  })

  describe('quote DAI <=> USDC', function () {
    it('should quote DAI to USDC using UniswapV2 price provider', async function () {
      const twoHour = DEFAULT_TWAP_PERIOD
      await priceProvider.update(DAI_ADDRESS, USDC_ADDRESS)
      await increaseTime(twoHour.mul('12'))
      await priceProvider.update(DAI_ADDRESS, USDC_ADDRESS)
      const {_amountOut} = await priceProvider.quote(DAI_ADDRESS, USDC_ADDRESS, parseEther('1'))
      expect(_amountOut).eq('998513')
    })

    it('should quote USDC to DAI using UniswapV2 price provider', async function () {
      const twoHour = DEFAULT_TWAP_PERIOD
      await priceProvider.update(DAI_ADDRESS, USDC_ADDRESS)
      await increaseTime(twoHour.mul('12'))
      await priceProvider.update(DAI_ADDRESS, USDC_ADDRESS)
      const {_amountOut} = await priceProvider.quote(USDC_ADDRESS, DAI_ADDRESS, '1000000')
      expect(_amountOut).eq('1001489207062323073')
    })
  })

  describe('quote WETH <=> USDC', function () {
    it('should quote WETH to USDC using UniswapV2 price provider', async function () {
      const twoHour = DEFAULT_TWAP_PERIOD
      await priceProvider.update(WETH_ADDRESS, USDC_ADDRESS)
      await increaseTime(twoHour.mul('12'))
      await priceProvider.update(WETH_ADDRESS, USDC_ADDRESS)
      const {_amountOut} = await priceProvider.quote(WETH_ADDRESS, USDC_ADDRESS, parseEther('1'))
      expect(_amountOut).eq('3462576293')
    })

    it('should quote USDC to WETH using UniswapV2 price provider', async function () {
      const twoHour = DEFAULT_TWAP_PERIOD
      await priceProvider.update(WETH_ADDRESS, USDC_ADDRESS)
      await increaseTime(twoHour.mul('12'))
      await priceProvider.update(WETH_ADDRESS, USDC_ADDRESS)
      const {_amountOut} = await priceProvider.quote(USDC_ADDRESS, WETH_ADDRESS, '3462576293')
      expect(_amountOut).eq('999999999990153138')
    })
  })

  describe('quote USDC <=> VSP', function () {
    const VSP_TOKEN_ADDRESS = '0x1b40183EFB4Dd766f11bDa7A7c3AD8982e998421'
    it('should quote VSP to USDC if USDC-WETH and WETH-VSP oracle exist', async function () {
      const twoHour = DEFAULT_TWAP_PERIOD
      await priceProvider.update(WETH_ADDRESS, USDC_ADDRESS)
      await priceProvider.update(WETH_ADDRESS, VSP_TOKEN_ADDRESS)
      await increaseTime(twoHour.mul('12'))
      await priceProvider.update(WETH_ADDRESS, USDC_ADDRESS)
      await priceProvider.update(WETH_ADDRESS, VSP_TOKEN_ADDRESS)
      const {_amountOut} = await priceProvider.quote(VSP_TOKEN_ADDRESS, USDC_ADDRESS, parseEther('1'))
      expect(_amountOut).eq('7042724')
    })
  })
})
