import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRoleEnum } from '@/common/constants/enum';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequiredRoles } from '@/common/decorators/roles.decorator';
import {
  AdjustStockDto,
  IssueStockDto,
  ReceiveStockDto,
  ReservationDto,
  TransferStockDto,
} from './dto/stock-operation.dto';
import { StockService } from './stock.service';

// Any signed-in user moves stock; only administrators overwrite a count.
@ApiBearerAuth()
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('receive')
  receive(@Body() dto: ReceiveStockDto, @CurrentUser('id') userId: string) {
    return this.stockService.receive(dto, userId);
  }

  @Post('issue')
  issue(@Body() dto: IssueStockDto, @CurrentUser('id') userId: string) {
    return this.stockService.issue(dto, userId);
  }

  @Post('adjust')
  @RequiredRoles(UserRoleEnum.ADMIN)
  adjust(@Body() dto: AdjustStockDto, @CurrentUser('id') userId: string) {
    return this.stockService.adjust(dto, userId);
  }

  @Post('transfer')
  transfer(@Body() dto: TransferStockDto, @CurrentUser('id') userId: string) {
    return this.stockService.transfer(dto, userId);
  }

  // Reservations record no movement, so these create nothing: 200, not 201.
  @Post('reserve')
  @HttpCode(HttpStatus.OK)
  reserve(@Body() dto: ReservationDto) {
    return this.stockService.reserve(dto);
  }

  @Post('release')
  @HttpCode(HttpStatus.OK)
  release(@Body() dto: ReservationDto) {
    return this.stockService.release(dto);
  }
}
