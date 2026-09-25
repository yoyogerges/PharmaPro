import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PrescriptionsService } from './prescriptions.service';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class PrescriptionHistoryController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get(':id/prescriptions')
  @Permissions('prescriptions.view')
  @ApiOperation({ summary: 'Prescription history for a customer' })
  prescriptionHistory(@Param('id') id: string) {
    return this.prescriptionsService.customerHistory(id);
  }
}