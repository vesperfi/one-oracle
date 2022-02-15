/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
import {parseEther} from '@ethersproject/units'
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UniswapV3PriceProvider__factory, UniswapV3PriceProvider} from '../typechain'
import {enableForking, disableForking, DEFAULT_TWAP_PERIOD} from './helpers'
import Address from '../helpers/address'
const {WETH_ADDRESS, WBTC_ADDRESS, DAI_ADDRESS, USDC_ADDRESS, UNISWAP_V3_CROSS_POOL_ORACLE_ADDRESS} = Address

describe('UniswapV3 price provider', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: UniswapV3PriceProvider
  const TEN_THOUSANDS_USD = 1000000000000 // USD price in 8 decimal places.
  before(enableForking)

  after(disableForking)

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const priceProviderFactory = new UniswapV3PriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy(UNISWAP_V3_CROSS_POOL_ORACLE_ADDRESS, DEFAULT_TWAP_PERIOD)
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quote token0 <=> token1', function () {
    const ONE_USDC = 1000000
    it('should quote DAI to USDC', async function () {
      const {_amountOut} = await priceProvider.quote(DAI_ADDRESS, USDC_ADDRESS, parseEther('1'))
      expect(_amountOut).eq('1000502')
    })

    it('should quote USDC to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(USDC_ADDRESS, DAI_ADDRESS, ONE_USDC)
      expect(_amountOut).eq('999497507462559528')
    })

    it('should quote WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))
      expect(_amountOut).eq('3446425038833366123852')
    })

    it('should quote VSP to USDC if USDC-WETH and WETH-VSP oracle exist', async function () {
      const VSP_TOKEN_ADDRESS = '0x1b40183EFB4Dd766f11bDa7A7c3AD8982e998421'
      const {_amountOut} = await priceProvider.quote(VSP_TOKEN_ADDRESS, USDC_ADDRESS, parseEther('1'))
      expect(_amountOut).eq('6913015')
    })
  })
})
