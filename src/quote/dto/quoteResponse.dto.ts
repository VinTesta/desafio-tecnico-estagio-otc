export interface QuoteResponseDto {
  quoteId: string,
  payToken: string,
  payAmount: string,
  receiveToken: string,
  receiveAmount: string,
  payment: {
    to: string,
    tokenAddress: string,
    calldata: string,
    chainId: number, 
  }
}