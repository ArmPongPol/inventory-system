import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { MasterDataQueryDto } from '@/common/dto/master-data-query.dto';

export class FindProductsQueryDto extends MasterDataQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
