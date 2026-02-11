import { Module } from '@nestjs/common';
import { DictionaryTypesController } from './dictionary-types.controller';
import { DictionaryTypesService } from './dictionary-types.service';
import { DictionaryTypesRepository } from './repositories/dictionary-types.repository';

@Module({
  controllers: [DictionaryTypesController],
  providers: [DictionaryTypesService, DictionaryTypesRepository],
  exports: [DictionaryTypesService],
})
export class DictionaryTypesModule {}
