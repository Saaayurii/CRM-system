import { Injectable, NotFoundException } from '@nestjs/common';
import { NoteRepository } from './repositories/note.repository';
import { CreateNoteDto, UpdateNoteDto } from './dto';

@Injectable()
export class NotesService {
  constructor(private readonly noteRepository: NoteRepository) {}

  findAll(accountId: number, userId: number, status?: string) {
    return this.noteRepository.findAll(accountId, userId, status);
  }

  findDue(accountId: number, userId: number) {
    return this.noteRepository.findDue(accountId, userId);
  }

  create(accountId: number, userId: number, dto: CreateNoteDto) {
    return this.noteRepository.create({
      accountId,
      userId,
      title: dto.title ?? null,
      content: dto.content,
      color: dto.color || 'yellow',
      remindAt: dto.remindAt ? new Date(dto.remindAt) : null,
    });
  }

  async update(
    id: number,
    accountId: number,
    userId: number,
    dto: UpdateNoteDto,
  ) {
    await this.ensureExists(id, accountId, userId);
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.remindAt !== undefined) {
      data.remindAt = dto.remindAt ? new Date(dto.remindAt) : null;
    }
    return this.noteRepository.update(id, accountId, userId, data);
  }

  async dismiss(id: number, accountId: number, userId: number) {
    await this.ensureExists(id, accountId, userId);
    return this.noteRepository.update(id, accountId, userId, {
      dismissedAt: new Date(),
    });
  }

  async restore(id: number, accountId: number, userId: number) {
    await this.ensureExists(id, accountId, userId);
    return this.noteRepository.update(id, accountId, userId, {
      dismissedAt: null,
    });
  }

  async remove(id: number, accountId: number, userId: number) {
    await this.ensureExists(id, accountId, userId);
    await this.noteRepository.remove(id, accountId, userId);
    return { success: true };
  }

  private async ensureExists(id: number, accountId: number, userId: number) {
    const note = await this.noteRepository.findById(id, accountId, userId);
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }
}
