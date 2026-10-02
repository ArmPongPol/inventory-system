import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRoleEnum } from '@/common/constants/enum';
import { MasterDataQueryDto } from '@/common/dto/master-data-query.dto';
import { RequiredRoles } from '@/common/decorators/roles.decorator';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehousesService } from './warehouses.service';

// Readable by every signed-in user; only administrators change it.
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @RequiredRoles(UserRoleEnum.ADMIN)
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(dto);
  }

  @Get()
  findAll(@Query() query: MasterDataQueryDto) {
    return this.warehousesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.warehousesService.findOneOrFail(id);
  }

  @Patch(':id')
  @RequiredRoles(UserRoleEnum.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehousesService.update(id, dto);
  }

  @Delete(':id')
  @RequiredRoles(UserRoleEnum.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.warehousesService.remove(id);
  }
}
