import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
  FindInventoryQueryDto,
  FindStockMovementsQueryDto,
  LowStockQueryDto,
} from './dto/inventory-query.dto';
import { InventoryService } from './inventory.service';

// Read-only, for every signed-in user. Changes go through /stock.
@ApiBearerAuth()
@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('inventory')
  findAll(@Query() query: FindInventoryQueryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get('inventory/low-stock')
  findLowStock(@Query() query: LowStockQueryDto) {
    return this.inventoryService.findLowStock(query);
  }

  @Get('stock-movements')
  findMovements(@Query() query: FindStockMovementsQueryDto) {
    return this.inventoryService.findMovements(query);
  }
}
