import { Module } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { QUOTER_CONTRACT_ADDRESS } from './constants/config';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json'
import { ethers } from 'ethers';

@Module({
  controllers: [QuoteController],
  providers: [
    QuoteService,
    {
      provide: 'Provider',
      useFactory: () => {
        const { getProvider } = require('./providers/json-rpc');
        return getProvider();
      },
    },
    {
      provide: 'QuoterContract',
      useFactory: (provider: any) => {
        return new ethers.Contract(
          QUOTER_CONTRACT_ADDRESS,
          Quoter.abi,
          provider
        )
      },
      inject: ['Provider'],
    },
    {
      provide: 'Wallet',
      useFactory: () => {
        const privateKey = process.env.SWAP_ACCOUNT_PRIVATE_KEY;
        if (!privateKey) {
          throw new Error('SWAP_ACCOUNT_PRIVATE_KEY environment variable is required');
        }
        return new ethers.Wallet(privateKey);
      },
    },
  ],
})
export class QuoteModule {}
