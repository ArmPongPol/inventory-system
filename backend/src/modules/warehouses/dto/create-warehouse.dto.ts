import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { normalizeCode, trim } from '@/common/transformers/string.transformers';

export class CreateWarehouseDto {
  @ApiProperty({
    example: 'WH-BKK',
    maxLength: 50,
    description: 'Stored uppercased, unique ignoring case.',
  })
  @Transform(normalizeCode)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Bangkok main warehouse', maxLength: 150 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
