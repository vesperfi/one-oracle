import {BigNumber} from '@ethersproject/bignumber'
import {ethers, network} from 'hardhat'

export const HOUR = BigNumber.from(60 * 60)
export const CHAINLINK_ETH_AGGREGATOR_ADDRESS = '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419'
export const CHAINLINK_BTC_AGGREGATOR_ADDRESS = '0xf4030086522a5beea4988f8ca5b36dbc97bee88c'
export const CHAINLINK_DOGE_AGGREGATOR_ADDRESS = '0x2465cefd3b488be410b941b1d4b2767088e2a028'
export const DEFAULT_TWAP_PERIOD = HOUR.mul('2')
export const BLOCKS_PER_YEAR = 2102400


export const increaseTime = async (timeToIncrease: BigNumber): Promise<void> => {
  await ethers.provider.send('evm_increaseTime', [timeToIncrease.toNumber()])
  await ethers.provider.send('evm_mine', [])
}

export const enableForking = async (): Promise<void> => {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: {
          jsonRpcUrl: process.env.NODE_URL,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          blockNumber: parseInt(process.env.BLOCK_NUMBER!),
        },
      },
    ],
  })
}

export const disableForking = async (): Promise<void> => {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [],
  })
}

export const setEtherBalance = async (address: string, value: BigNumber): Promise<void> => {
  await network.provider.request({
    method: 'hardhat_setBalance',
    params: [address, ethers.utils.hexStripZeros(value.toHexString())],
  })
}
