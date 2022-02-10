/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {DefaultOracle, DefaultOracle__factory, ChainlinkPriceProvider__factory} from '../typechain'

import {CHAINLINK_PRICE_FEED, enableForking, disableForking} from './helpers'

const {MaxUint256} = ethers.constants

const Protocol = {
  NONE: 0,
  UNISWAP_V3: 1,
  UNISWAP_V2: 2,
  CHAINLINK: 3,
}

const abi = new ethers.utils.AbiCoder()

describe('DefaultOracle', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let user: SignerWithAddress
  let oracle: DefaultOracle

  before(enableForking)

  after(disableForking)

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, user] = await ethers.getSigners()

    // Chainlink
    const chainlinkPriceProviderFactory = new ChainlinkPriceProvider__factory(deployer)
    const chainlinkPriceProvider = await chainlinkPriceProviderFactory.deploy(CHAINLINK_PRICE_FEED)
    await chainlinkPriceProvider.deployed()

    // Oracle
    const oracleFactory = new DefaultOracle__factory(deployer)
    oracle = await oracleFactory.deploy()
    await oracle.deployed()

    await oracle.setPriceProvider(Protocol.CHAINLINK, chainlinkPriceProvider.address)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('using latest price (view) functions', function () {
    describe('convertToUsd', function () {
      it('should convert to USD using no price provider needed', async function () {})
    })
  })
})
