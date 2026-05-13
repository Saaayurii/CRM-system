import { Module } from '@nestjs/common';
import { CommercialProposalsController } from './commercial-proposals.controller';
import { CommercialProposalsService } from './commercial-proposals.service';
import { ProposalRepository } from './repositories/proposal.repository';

@Module({
  controllers: [CommercialProposalsController],
  providers: [CommercialProposalsService, ProposalRepository],
  exports: [CommercialProposalsService],
})
export class CommercialProposalsModule {}
