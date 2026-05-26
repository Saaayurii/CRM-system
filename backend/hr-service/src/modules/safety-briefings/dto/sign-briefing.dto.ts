import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class SignBriefingDto {
  // base64-encoded PNG из canvas
  @IsString()
  @IsNotEmpty()
  signatureData!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
