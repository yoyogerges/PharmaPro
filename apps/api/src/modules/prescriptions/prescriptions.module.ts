import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NumberingModule } from '../../common/services/numbering.module';
import { PrescriptionHistoryController } from './prescription-history.controller';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  imports: [AuditModule, NumberingModule],
  controllers: [PrescriptionsController, PrescriptionHistoryController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}