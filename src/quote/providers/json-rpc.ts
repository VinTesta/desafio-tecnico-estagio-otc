import { ethers, providers } from 'ethers'

export function getProvider(): providers.Provider {
  return new ethers.providers.JsonRpcProvider(process.env.MAINNET_RPC_URL || '')
}