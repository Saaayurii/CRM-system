import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateClientInteractionDto } from '../dto/create-client-interaction.dto';
import { UpdateClientInteractionDto } from '../dto/update-client-interaction.dto';

@Injectable()
export class ClientInteractionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20, clientId?: number) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (clientId) where.clientId = clientId;
    const [data, total] = await Promise.all([
      (this.prisma as any).clientInteraction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).clientInteraction.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number) {
    return (this.prisma as any).clientInteraction.findUnique({ where: { id } });
  }

  async create(dto: CreateClientInteractionDto) {
    return (this.prisma as any).clientInteraction.create({
      data: {
        ...dto,
        interactionDate: new Date(dto.interactionDate),
        nextActionDate: dto.nextActionDate
          ? new Date(dto.nextActionDate)
          : null,
      },
    });
  }

  async update(id: number, dto: UpdateClientInteractionDto) {
    const data: any = { ...dto };
    if (dto.interactionDate)
      data.interactionDate = new Date(dto.interactionDate);
    if (dto.nextActionDate) data.nextActionDate = new Date(dto.nextActionDate);
    return (this.prisma as any).clientInteraction.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return (this.prisma as any).clientInteraction.delete({ where: { id } });
  }
}
