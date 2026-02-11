import { IsString, IsOptional, IsNumber, IsDateString, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document title', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Document type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentType?: string;

  @ApiPropertyOptional({ description: 'Document number', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsOptional()
  @IsNumber()
  constructionSiteId?: number;

  @ApiPropertyOptional({ description: 'Version', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;

  @ApiPropertyOptional({ description: 'File URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'File type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fileType?: string;

  @ApiPropertyOptional({ description: 'Issue date' })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Status', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional({ description: 'Access level', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accessLevel?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  tags?: any;
}
