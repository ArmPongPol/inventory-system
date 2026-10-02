import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trim } from '@/common/transformers/string.transformers';

export class CreateUnitDto {
  @ApiProperty({ example: 'Kilogram', maxLength: 50 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'kg', maxLength: 20 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol: string;
}
