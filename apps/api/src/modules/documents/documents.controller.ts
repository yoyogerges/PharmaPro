import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UploadDocumentDto } from './dto/document.dto';
import { DocumentsService } from './documents.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @Permissions('documents.upload')
  @ApiOperation({ summary: 'Upload a document (multipart field: file)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('A file is required (field name: file)');
    return this.documentsService.upload(file, dto, user.sub);
  }

  @Get('entity/:type/:id')
  @Permissions('documents.view')
  @ApiOperation({ summary: 'List documents attached to an entity' })
  listForEntity(@Param('type') entityType: string, @Param('id') entityId: string) {
    return this.documentsService.findForEntity(entityType, entityId);
  }

  @Get(':id/download')
  @Permissions('documents.view')
  @ApiOperation({ summary: 'Download a document' })
  async download(@Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const { document, buffer } = await this.documentsService.getDownload(id);
    const filename = encodeURIComponent(document.originalName);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(buffer, {
      type: document.mimeType || 'application/octet-stream',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Delete(':id')
  @Permissions('documents.delete')
  @ApiOperation({ summary: 'Delete a document' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.documentsService.remove(id, user.sub);
  }
}