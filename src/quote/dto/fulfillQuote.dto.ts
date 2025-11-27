import { IsNotEmpty, IsString } from 'class-validator';

export class FulfillQuoteDto {
  @IsNotEmpty()
  @IsString()
  quoteId: string;

  @IsNotEmpty()
  @IsString()
  txHash: string;
}

export class FulfillResponseDto {
  status: 'fulfilled' | 'failed';
  quoteId: string;
  payTxHash: string;
  payout: {
    token: string;
    amount: string;
    status: 'sent' | 'failed';
  };
}
