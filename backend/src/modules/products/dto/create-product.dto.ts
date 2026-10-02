import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsNonNegativeQuantity } from '@/common/dto/quantity.decorator';
import { normalizeCode, trim } from '@/common/transformers/string.transformers';

export class CreateProductDto {
  @ApiProperty({
    example: 'SKU-0001',
    maxLength: 50,
    description: 'Stored uppercased, unique ignoring case.',
  })
  @Transform(normalizeCode)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku: string;

  @ApiProperty({ example: 'Drinking water 600 ml', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  // null clears it (on update).
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  unitId?: string | null;

  @ApiPropertyOptional({ example: 20, minimum: 0, default: 0 })
  @IsOptional()
  @IsNonNegativeQuantity()
  minimumStock?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
