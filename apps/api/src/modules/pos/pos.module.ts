import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { NumberingModule } from '../../common/services/numbering.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [AuditModule, NumberingModule, CashRegisterModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}