import {BigNumber} from '@ethersproject/bignumber'
import {ethers, network} from 'hardhat'

export const HOUR = BigNumber.from(60 * 60)
export const CHAINLINK_PRICE_FEED = '0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf'
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
