import { ChainId, Token } from "@uniswap/sdk-core"

export const POOL_FACTORY_CONTRACT_ADDRESS =
  '0x1F98431c8aD98523631AE4a59f267346ea31F984'
export const QUOTER_CONTRACT_ADDRESS =
  '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'

export const SWAP_ACCOUNT_ADDRESS = "0x4899561771600ba4a00430f5b0d5aef3cf82df36"

export const transferAbi = [
  "function transfer(address to, uint256 amount) returns (bool)"
];

const WETH_TOKEN = new Token(
  1,
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  18,
  'WETH',
  'Wrapped Ether',
)
  
const USDC_TOKEN = new Token(
  1,
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  6,
  'USDC',
  'USD//C'
)

const WBTC_TOKEN = new Token(
  1,
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  8,
  'WBTC',
  'Wrapped Bitcoin'
)

export const TOKENS_MAP: { [key: string]: Token } = {
  'ETH': WETH_TOKEN,
  'USDC': USDC_TOKEN,
  'WBTC': WBTC_TOKEN,
}

export const SepoliaTokensAddresses: { [key: string]: string } = {
  'WETH': '0xdd13E55209Fd76AfE204dBda4007C227904f0A81', // WETH Sepolia
  'USDC': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC Sepolia
  'WBTC': '0x087c5ad514D1784a21721656847C9A2c12C3e6DE', // WBTC Sepolia
}

export const CHAIN_ID = ChainId.SEPOLIA