import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import { FulfillQuoteDto, FulfillResponseDto } from './dto/fulfillQuote.dto';

@Injectable()
export class QuoteService {

  constructor(
    @Inject('Provider') private readonly provider: ethers.providers.Provider,
    @Inject('QuoterContract') private readonly quoterContract: ethers.Contract,
    @Inject('Wallet') private readonly wallet: ethers.Wallet,
    private readonly prisma: PrismaService,
  ) {}
  
  async getQuote(params: GetQuoteControllerDto): Promise<QuoteResponseDto> {
    const inputToken = TOKENS_MAP[params.payToken];
    const outputToken = TOKENS_MAP[params.receiveToken];
    const quoteConfig: QuoteConfig = {
      rpc: {
        mainnet: process.env.MAINNET_RPC_URL || '',
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

  async fulfillQuote(params: FulfillQuoteDto): Promise<FulfillResponseDto> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: params.quoteId },
      include: {
        payToken: true,
        receiveToken: true,
      },
    });

    if (!quote || quote.status !== 'PENDING') {
      throw new NotFoundException(`Nenhuma cotação com id ${params.quoteId} encontrada`);
    }

    const sepoliaProvider = new ethers.providers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL || ''
    );

    const tx = await sepoliaProvider.getTransaction(params.txHash);
    if (!tx) {
      throw new BadRequestException(`A transação ${params.txHash} não existe`);
    }

    const receipt = await sepoliaProvider.getTransactionReceipt(params.txHash);
    if (!receipt) throw new BadRequestException(`Transação ${params.txHash} pendente`);

    if (receipt.status !== 1) throw new BadRequestException(`A transação ${params.txHash} falhou`);


    const tokenAddress = SepoliaTokensAddresses[quote.payToken.symbol].toLowerCase();
    const isEthPayment = quote.payToken.symbol === 'ETH' || quote.payToken.symbol === 'WETH';
    
    if (isEthPayment) {
      if (tx.to?.toLowerCase() !== SWAP_ACCOUNT_ADDRESS.toLowerCase()) {
        throw new BadRequestException(`Destino da transação não corresponde ao endereço esperado`);
      }
      
      const expectedAmount = ethers.utils.parseEther(quote.payAmount);
      if (tx.value.lt(expectedAmount)) {
        throw new BadRequestException(`Valor da transação é menor que o esperado`);
      }
    } else {
      if (tx.to?.toLowerCase() !== tokenAddress) {
        throw new BadRequestException(`Token da transação não corresponde ao contrato esperado`);
      }

      const transferEventSignature = ethers.utils.id('Transfer(address,address,uint256)');
      const transferLog = receipt.logs.find(
        log => log.topics[0] === transferEventSignature && 
               log.address.toLowerCase() === tokenAddress
      );

      if (!transferLog) {
        throw new BadRequestException(`Sem log de transferência`);
      }

      const decodedLog = ethers.utils.defaultAbiCoder.decode(
        ['uint256'],
        transferLog.data
      );
      const toAddress = '0x' + transferLog.topics[2].slice(26);
      const amount = decodedLog[0];

      if (toAddress.toLowerCase() !== SWAP_ACCOUNT_ADDRESS.toLowerCase()) {
        throw new BadRequestException(`Endereço de destino da transferência não corresponde ao esperado`);
      }

      const expectedAmount = ethers.utils.parseUnits(quote.payAmount, 6);
      if (amount.lt(expectedAmount)) {
        throw new BadRequestException(`Valor da transação é menor que o esperado`);
      }
    }

    let payTxHash: string;
    try {
      const sepoliaWallet = this.wallet.connect(sepoliaProvider);
      const receiveTokenAddress = SepoliaTokensAddresses[quote.receiveToken.symbol];
      const receiveAmount = quote.receiveAmount;
      
      const payerAddress = tx.from;

      if (quote.receiveToken.symbol === 'ETH' || quote.receiveToken.symbol === 'WETH') {
        const payoutTx = await sepoliaWallet.sendTransaction({
          to: payerAddress,
          value: ethers.utils.parseEther(receiveAmount),
        });
        await payoutTx.wait();
        payTxHash = payoutTx.hash;
      } else {
        const tokenContract = new ethers.Contract(
          receiveTokenAddress,
          transferAbi,
          sepoliaWallet
        );
        
        const decimals = quote.receiveToken.symbol === 'USDC' ? 6 : 18;
        const payoutTx = await tokenContract.transfer(
          payerAddress,
          ethers.utils.parseUnits(receiveAmount, decimals)
        );
        await payoutTx.wait();
        payTxHash = payoutTx.hash;
      }

      await this.prisma.quote.update({
        where: { id: params.quoteId },
        data: { status: 'FULFILLED' },
      });
    } catch (error) {
      throw new BadRequestException(`Falha ao executar pagamento: ${error.message}`);
    }

    return {
      status: 'fulfilled',
      quoteId: params.quoteId,
      payTxHash: payTxHash,
      payout: {
        token: quote.receiveToken.symbol,
        amount: quote.receiveAmount,
        status: 'sent',
      },
    };
  }
}
