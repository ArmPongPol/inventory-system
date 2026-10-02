import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { StockMovementTypeEnum } from '@/common/constants/enum';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { normalizeCode } from '@/common/transformers/string.transformers';

export class FindInventoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

export class LowStockQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      "Compare this warehouse's quantity (instead of the total across all " +
      'warehouses) with the minimum stock',
  })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

export class FindStockMovementsQueryDto extends FindInventoryQueryDto {
  @ApiPropertyOptional({ enum: StockMovementTypeEnum })
  @IsOptional()
  @IsEnum(StockMovementTypeEnum)
  movementType?: StockMovementTypeEnum;

  @ApiPropertyOptional({ example: 'TRANSFER' })
  @IsOptional()
  @Transform(normalizeCode)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  referenceType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Inclusive' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ format: 'date-time', description: 'Exclusive' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
