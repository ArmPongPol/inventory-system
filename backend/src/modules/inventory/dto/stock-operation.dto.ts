import {
  ApiProperty,
  ApiPropertyOptional,
  ApiPropertyOptions,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  IsNonNegativeQuantity,
  IsQuantity,
  MAX_QUANTITY,
} from '@/common/dto/quantity.decorator';
import { normalizeCode, trim } from '@/common/transformers/string.transformers';

const QUANTITY_DOC: ApiPropertyOptions = {
  example: 10,
  minimum: 0,
  exclusiveMinimum: true,
  maximum: MAX_QUANTITY,
};

/** Optional context recorded on the stock_movements row(s). */
export class MovementContextDto {
  @ApiPropertyOptional({
    example: 'PURCHASE_ORDER',
    maxLength: 50,
    description: 'What caused the movement. Stored uppercased.',
  })
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

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class StockLocationDto extends MovementContextDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  warehouseId: string;
}

export class ReceiveStockDto extends StockLocationDto {
  @ApiProperty(QUANTITY_DOC)
  @IsQuantity()
  quantity: number;
}

export class IssueStockDto extends StockLocationDto {
  @ApiProperty(QUANTITY_DOC)
  @IsQuantity()
  quantity: number;

  @ApiPropertyOptional({
    default: false,
    description:
      'Issue stock that was reserved earlier: lowers reserved_quantity too. ' +
      'Otherwise only the unreserved (available) quantity can be issued.',
  })
  @IsOptional()
  @IsBoolean()
  fromReserved?: boolean;
}

export class AdjustStockDto extends StockLocationDto {
  @ApiProperty({
    example: 8,
    minimum: 0,
    maximum: MAX_QUANTITY,
    description: 'The physically counted quantity; becomes the new on-hand.',
  })
  @IsNonNegativeQuantity()
  countedQuantity: number;
}

export class TransferStockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  fromWarehouseId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toWarehouseId: string;

  @ApiProperty(QUANTITY_DOC)
  @IsQuantity()
  quantity: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  remark?: string;
}

/** Reserve or release: changes reserved_quantity only, records no movement. */
export class ReservationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty(QUANTITY_DOC)
  @IsQuantity()
  quantity: number;
}
