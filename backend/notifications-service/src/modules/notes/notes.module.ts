import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { NoteRepository } from './repositories/note.repository';

@Module({
  controllers: [NotesController],
  providers: [NotesService, NoteRepository],
  exports: [NotesService],
})
export class NotesModule {}
