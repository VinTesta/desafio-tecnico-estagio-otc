import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuoteModule } from './quote/quote.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [QuoteModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
