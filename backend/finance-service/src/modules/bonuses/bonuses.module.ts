import { Module } from '@nestjs/common';
import { BonusesController } from './bonuses.controller';
import { BonusesService } from './bonuses.service';
import { BonusRepository } from './repositories/bonus.repository';

@Module({
  controllers: [BonusesController],
  providers: [BonusesService, BonusRepository],
  exports: [BonusesService],
})
export class BonusesModule {}
