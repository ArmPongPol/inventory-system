import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { trim } from '@/common/transformers/string.transformers';

export class FindUnitsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive partial match' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  search?: string;
}
