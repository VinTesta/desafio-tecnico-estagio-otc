import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { Currency } from "src/common/enum/currency";

export default class GetQuoteControllerDto {
  @IsNotEmpty()
  @IsEnum(Currency)
  payToken: Currency;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  payAmount: number;

  @IsNotEmpty()
  @IsEnum(Currency)
  receiveToken: Currency;
}