import { ChainId, Token } from "@uniswap/sdk-core"

export const POOL_FACTORY_CONTRACT_ADDRESS =
  '0x1F98431c8aD98523631AE4a59f267346ea31F984'
export const QUOTER_CONTRACT_ADDRESS =
  '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'

export const SWAP_ACCOUNT_ADDRESS = "0x4cf7c05655cb6d2d9ad80c11849364ad9e8d95eb"

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
  'USDC': '0x07865c6E87B9F70255377e024ace6630C1Eaa37F', // USDC Sepolia
  'WBTC': '0x171e51AE433924B1A8c9C970E137BE3a484005eF', // WBTC Sepolia
}

export const CHAIN_ID = ChainId.SEPOLIA