import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { QuoteService } from './quote.service';
import GetQuoteControllerDto from './dto/getQuoteController.dto';
import { ValidationPipe } from 'src/classValidator/validation.pipe';
import { QuoteResponseDto } from './dto/quoteResponse.dto';

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get(':payToken/:receiveToken/:payAmount')
  async getQuote(
    @Param(new ValidationPipe({ transform: true })) params: GetQuoteControllerDto
  ): Promise<QuoteResponseDto> {
    return this.quoteService.getQuote(params);
  }

  @Get('/')
  async getQuotesList() {
    return await this.quoteService.getQuotesList();
  }
}
