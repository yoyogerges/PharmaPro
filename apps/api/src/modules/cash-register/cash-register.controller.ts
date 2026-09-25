import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CashRegisterService } from './cash-register.service';
import { CloseRegisterDto, CreateMovementDto, OpenRegisterDto } from './dto/cash-register.dto';

@ApiTags('Cash Register')
@ApiBearerAuth()
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Get()
  @Permissions('cash_register.view')
  @ApiOperation({ summary: 'List active cash registers' })
  listRegisters() {
    return this.cashRegisterService.listRegisters();
  }

  @Post('open')
  @Permissions('cash_register.open')
  @ApiOperation({ summary: 'Open a cash session' })
  open(@Body() dto: OpenRegisterDto, @Req() request: Request) {
    return this.cashRegisterService.open(dto, request);
  }

  @Post('close')
  @Permissions('cash_register.close')
  @ApiOperation({ summary: 'Close the open cash session with reconciliation' })
  close(@Body() dto: CloseRegisterDto, @Req() request: Request) {
    return this.cashRegisterService.close(dto, request);
  }

  @Get('movements')
  @Permissions('cash_register.view')
  @ApiOperation({ summary: 'Movements of the current (or given) session' })
  movements(@Query() query: { sessionId?: string }, @Req() request: Request) {
    return this.cashRegisterService.movements(request, query.sessionId);
  }

  @Post('movements')
  @Permissions('cash_register.open')
  @ApiOperation({ summary: 'Add a manual cash movement (deposit / withdrawal / adjustment)' })
  createMovement(@Body() dto: CreateMovementDto, @Req() request: Request) {
    return this.cashRegisterService.createMovement(dto, request);
  }

  @Get('session')
  @Permissions('cash_register.view')
  @ApiOperation({ summary: 'Current cash session for the user' })
  currentSession(@Req() request: Request) {
    return this.cashRegisterService.currentSession(request);
  }

  @Get('summary')
  @Permissions('cash_register.view')
  @ApiOperation({ summary: 'Financial summary of the cash session' })
  summary(@Req() request: Request) {
    return this.cashRegisterService.summary(request);
  }
}