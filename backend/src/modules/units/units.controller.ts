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
import { RequiredRoles } from '@/common/decorators/roles.decorator';
import { CreateUnitDto } from './dto/create-unit.dto';
import { FindUnitsQueryDto } from './dto/find-units-query.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitsService } from './units.service';

// Readable by every signed-in user; only administrators change it.
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @RequiredRoles(UserRoleEnum.ADMIN)
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  @Get()
  findAll(@Query() query: FindUnitsQueryDto) {
    return this.unitsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.unitsService.findOneOrFail(id);
  }

  @Patch(':id')
  @RequiredRoles(UserRoleEnum.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }

  @Delete(':id')
  @RequiredRoles(UserRoleEnum.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.unitsService.remove(id);
  }
}
