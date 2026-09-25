import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Public pharmacy profile (name, currency, tax rate)' })
  getPublic() {
    return this.settingsService.getPublicProfile();
  }

  @Get('pharmacy')
  @ApiBearerAuth()
  @Permissions('settings.view')
  @ApiOperation({ summary: 'Get pharmacy profile' })
  getPharmacy() {
    return this.settingsService.getPharmacy();
  }

  @Patch('pharmacy')
  @ApiBearerAuth()
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Update pharmacy profile' })
  updatePharmacy(@Body() body: Record<string, unknown>) {
    return this.settingsService.updatePharmacy(body);
  }

  @Get('logo')
  @Public()
  @ApiOperation({ summary: 'Pharmacy logo image' })
  async getLogo() {
    const { buffer, mimeType } = await this.settingsService.getLogo().catch(() => {
      throw new NotFoundException('No logo uploaded');
    });
    return new StreamableFile(buffer, { type: mimeType });
  }

  @Post('logo')
  @ApiBearerAuth()
  @Permissions('settings.update')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload the pharmacy logo' })
  uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new NotFoundException('No file uploaded');
    return this.settingsService.uploadLogo(file);
  }

  @Get()
  @ApiBearerAuth()
  @Permissions('settings.view')
  @ApiOperation({ summary: 'Read all system settings' })
  findAll() {
    return this.settingsService.findAll();
  }

  @Patch()
  @ApiBearerAuth()
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Update system settings and pharmacy profile' })
  update(@Body() body: Record<string, unknown>) {
    return this.settingsService.update(body);
  }
}