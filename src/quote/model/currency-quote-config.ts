import { Token } from "@uniswap/sdk-core"

export interface QuoteConfig {
  rpc: {
    mainnet: string
  }
  tokens: {
    in: Token
    amountIn: number
    out: Token
    poolFee: number
  }
}