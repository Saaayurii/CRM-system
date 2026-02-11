import { PartialType } from '@nestjs/swagger';
import { CreateWikiPageDto } from './create-wiki-page.dto';
export class UpdateWikiPageDto extends PartialType(CreateWikiPageDto) {}
