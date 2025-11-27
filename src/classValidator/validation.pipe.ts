import {
  PipeTransform,
  ArgumentMetadata,
  ValidationPipeOptions,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export class ValidationPipe implements PipeTransform {
  constructor(private readonly options: ValidationPipeOptions = {}) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    const { metatype } = metadata;

    if (!metatype || typeof metatype !== 'function') return value;

    const object = this.options.transform
      ? plainToInstance(metatype, value)
      : value;

    const errors = await validate(object);
    if (errors.length > 0) {
      throw new Error(JSON.stringify(errors));
    }

    return object;
  }
}
