import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ContractorRepository } from './repositories/contractor.repository';
import {
  CreateContractorDto,
  UpdateContractorDto,
  CreateContractorAssignmentDto,
} from './dto';

@Injectable()
export class ContractorsService {
  constructor(private readonly contractorRepository: ContractorRepository) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    contractors: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [contractors, total] = await Promise.all([
      this.contractorRepository.findAll(accountId, { skip, take: limit }),
      this.contractorRepository.count(accountId),
    ]);

    return {
      contractors,
      total,
      page,
      limit,
    };
  }

  async findById(id: number, requestingUserAccountId: number) {
    const contractor = await this.contractorRepository.findById(id);
    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }

    if (contractor.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return contractor;
  }

  async create(
    createContractorDto: CreateContractorDto,
    requestingUserAccountId: number,
  ) {
    if (createContractorDto.accountId !== requestingUserAccountId) {
      throw new ForbiddenException(
        'Cannot create contractors in another account',
      );
    }

    return this.contractorRepository.create(createContractorDto);
  }

  async update(
    id: number,
    updateContractorDto: UpdateContractorDto,
    requestingUserAccountId: number,
  ) {
    const contractor = await this.contractorRepository.findById(id);
    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }

    if (contractor.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.contractorRepository.update(id, updateContractorDto);
  }

  async remove(id: number, requestingUserAccountId: number): Promise<void> {
    const contractor = await this.contractorRepository.findById(id);
    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }

    if (contractor.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    await this.contractorRepository.softDelete(id);
  }

  async getAssignments(contractorId: number, requestingUserAccountId: number) {
    const contractor = await this.contractorRepository.findById(contractorId);
    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }

    if (contractor.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.contractorRepository.findAssignments(contractorId);
  }

  async addAssignment(
    contractorId: number,
    createAssignmentDto: CreateContractorAssignmentDto,
    requestingUserAccountId: number,
  ) {
    const contractor = await this.contractorRepository.findById(contractorId);
    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }

    if (contractor.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.contractorRepository.createAssignment(
      contractorId,
      createAssignmentDto,
    );
  }
}
