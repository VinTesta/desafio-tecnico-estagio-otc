import { Inject, Injectable } from '@nestjs/common';
import { computePoolAddress, FeeAmount } from '@uniswap/v3-sdk';
import { CHAIN_ID, POOL_FACTORY_CONTRACT_ADDRESS, QUOTER_CONTRACT_ADDRESS, SepoliaTokensAddresses, SWAP_ACCOUNT_ADDRESS, TOKENS_MAP, transferAbi } from './constants/config';
import { BigNumber, ethers } from 'ethers';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import { fromReadableAmount } from 'src/common/conversion/amountConvertions';
import { env } from 'process';
import { ChainId, Token } from '@uniswap/sdk-core';
import GetQuoteControllerDto from './dto/getQuoteController.dto';
import { QuoteConfig } from './model/currency-quote-config';
import { QuoteResponseDto } from './dto/quoteResponse.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class QuoteService {

  constructor(
    @Inject('Provider') private readonly provider: ethers.providers.Provider,
    @Inject('QuoterContract') private readonly quoterContract: ethers.Contract,
    private readonly prisma: PrismaService,
  ) {}
  
  async getQuote(params: GetQuoteControllerDto): Promise<QuoteResponseDto> {
    const inputToken = TOKENS_MAP[params.payToken];
    const outputToken = TOKENS_MAP[params.receiveToken];
    const quoteConfig: QuoteConfig = {
      rpc: {
        mainnet: process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/92fcd00cfdbe4363b32a2306d9d3b70f',
      },
      tokens: {
        in: inputToken,
        amountIn: params.payAmount,
        out: outputToken,
        poolFee: FeeAmount.MEDIUM,
      },
    }

    const poolConstants = await this.getPoolConstants(quoteConfig)

    const quotedAmountOut = JSON.parse(
      await this.quoterContract.callStatic.quoteExactInputSingle(
        quoteConfig.tokens.in.address,
        quoteConfig.tokens.out.address,
        poolConstants.fee,
        fromReadableAmount(
          quoteConfig.tokens.amountIn,
          quoteConfig.tokens.in.decimals
        ).toString(),
        0
    ));

    const bn = BigNumber.from(this.toPlainString(quotedAmountOut));

    const amount = (quotedAmountOut / (10 ** quoteConfig.tokens.out.decimals)).toString()

    const funcInterface = new ethers.utils.Interface(transferAbi)
    let calldata = "0x";
    if (inputToken.symbol != "WETH") {
      calldata = funcInterface.encodeFunctionData("transfer", [
        SWAP_ACCOUNT_ADDRESS,
        ethers.utils.parseUnits(params.payAmount.toString())
      ]);
    }

    // Buscar ou criar as currencies no banco
    const payTokenAddress = SepoliaTokensAddresses[quoteConfig.tokens.in.symbol || ''];
    const receiveTokenAddress = SepoliaTokensAddresses[quoteConfig.tokens.out.symbol || ''];

    const payCurrency = await this.prisma.currency.upsert({
      where: { symbol: params.payToken },
      update: {},
      create: {
        symbol: params.payToken,
        chainId: CHAIN_ID,
        tokenAddress: payTokenAddress,
      },
    });

    const receiveCurrency = await this.prisma.currency.upsert({
      where: { symbol: params.receiveToken },
      update: {},
      create: {
        symbol: params.receiveToken,
        chainId: CHAIN_ID,
        tokenAddress: receiveTokenAddress,
      },
    });

    // Salvar a cotação no banco
    const savedQuote = await this.prisma.quote.create({
      data: {
        payTokenId: payCurrency.id,
        payTo: SWAP_ACCOUNT_ADDRESS,
        payAmount: params.payAmount.toString(),
        receiveTokenId: receiveCurrency.id,
        receiveAmount: amount,
        paymentCalldata: calldata,
      },
    });

    return {
      quoteId: savedQuote.id,
      payToken: params.payToken,
      payAmount: params.payAmount.toString(),
      receiveToken: params.receiveToken,
      receiveAmount: amount,
      payment: {
        to: SWAP_ACCOUNT_ADDRESS,
        tokenAddress: SepoliaTokensAddresses[quoteConfig.tokens.in.symbol || ''], // Troca pelo endereço da testnet
        calldata: calldata,
        chainId: CHAIN_ID, 
      }
    };
  }

  async getQuotesList() {
    return this.prisma.quote.findMany({
      include: {
        payToken: true,
        receiveToken: true,
      },
    });
  }

  toPlainString(num) {
    return num.toString().indexOf("e") === -1
      ? num.toString()
      : num.toLocaleString("fullwide", { useGrouping: false });
  }

  async getPoolConstants(
    quoteConfig: QuoteConfig
  ): Promise<{
    token0: string
    token1: string
    fee: number
  }> {
    console.log(quoteConfig)
    const currentPoolAddress = computePoolAddress({
      factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
      tokenA: quoteConfig.tokens.in,
      tokenB: quoteConfig.tokens.out,
      fee: quoteConfig.tokens.poolFee,
    })

    const poolContract = new ethers.Contract(
      currentPoolAddress,
      IUniswapV3PoolABI.abi,
      this.provider
    )
    const [token0, token1, fee] = await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
    ])

    return {
      token0,
      token1,
      fee,
    }
  }
}
