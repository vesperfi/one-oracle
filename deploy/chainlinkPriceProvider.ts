import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

import Address from '../helpers/address'
const {CHAINLINK_PRICE_FEED, WETH_ADDRESS, WBTC_ADDRESS} = Address

const ChainlinkPriceProvider = 'ChainlinkPriceProvider'

const func: DeployFunction = async function ({getNamedAccounts, deployments}: HardhatRuntimeEnvironment) {
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(ChainlinkPriceProvider, {
    from: deployer,
    log: true,
    args: [CHAINLINK_PRICE_FEED, WETH_ADDRESS, WBTC_ADDRESS],
  })
}

export default func
func.tags = [ChainlinkPriceProvider]
