import { ethers, providers } from 'ethers'

// Provider Functions

export function getProvider(): providers.Provider {
  return new ethers.providers.JsonRpcProvider(process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/92fcd00cfdbe4363b32a2306d9d3b70f')
}