import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { toBoolean, trim } from '../transformers/string.transformers';
import { PaginationQueryDto } from './pagination-query.dto';

/** List filters shared by the master-data tables (categories, warehouses, products). */
export class MasterDataQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive partial match' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}
