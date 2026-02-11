import { Module } from '@nestjs/common';
import { DictionaryValuesController } from './dictionary-values.controller';
import { DictionaryValuesService } from './dictionary-values.service';
import { DictionaryValuesRepository } from './repositories/dictionary-values.repository';

@Module({
  controllers: [DictionaryValuesController],
  providers: [DictionaryValuesService, DictionaryValuesRepository],
  exports: [DictionaryValuesService],
})
export class DictionaryValuesModule {}
