import { Module } from '@nestjs/common';
import { ClientInteractionsController } from './client-interactions.controller';
import { ClientInteractionsService } from './client-interactions.service';
import { ClientInteractionRepository } from './repositories/client-interaction.repository';

@Module({
  controllers: [ClientInteractionsController],
  providers: [ClientInteractionsService, ClientInteractionRepository],
  exports: [ClientInteractionsService],
})
export class ClientInteractionsModule {}
