/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
import {parseEther, parseUnits} from '@ethersproject/units'
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkPriceProvider, ChainlinkPriceProvider__factory} from '../typechain'
import {CHAINLINK_PRICE_FEED, enableForking, disableForking} from './helpers'
import Address from '../helpers/address'
const {WETH_ADDRESS, WBTC_ADDRESS} = Address

describe('ChainlinkPriceProvider', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: ChainlinkPriceProvider

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
    it('convert same token to same token', async function () {
      const amountIn = parseEther('100')
      const {_amountOut} = await priceProvider.quote(WETH_ADDRESS, WETH_ADDRESS, amountIn)
      expect(_amountOut).to.be.equal(amountIn, 'Amount out is wrong')
    })
  })
})
