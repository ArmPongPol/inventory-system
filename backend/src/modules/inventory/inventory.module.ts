import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { Inventory } from './entities/inventory.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, StockMovement]),
    ProductsModule,
    WarehousesModule,
  ],
  controllers: [InventoryController, StockController],
  providers: [InventoryService, StockService],
})
export class InventoryModule {}
