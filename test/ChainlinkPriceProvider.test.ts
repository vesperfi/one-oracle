/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
import {parseEther, parseUnits} from '@ethersproject/units'
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkPriceProvider, ChainlinkPriceProvider__factory} from '../typechain'
import {CHAINLINK_PRICE_FEED, enableForking, disableForking} from './helpers'

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
    priceProvider = await priceProviderFactory.deploy(CHAINLINK_PRICE_FEED)
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('convert', function () {
    it('should get Token->Token price', async function () {})
  })
})
