import { Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Document } from '@prisma/client';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { UploadDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  private readonly storageDir = resolve(process.cwd(), 'uploads', 'documents');

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    await mkdir(this.storageDir, { recursive: true });
  }

  private sanitize(document: Document) {
    const { path: _path, ...rest } = document;
    return rest;
  }

  async upload(file: Express.Multer.File, dto: UploadDocumentDto, userId: string) {
    const ext = extname(file.originalname).slice(0, 12);
    const fileName = `${randomUUID()}${ext}`;
    const path = join(this.storageDir, fileName);
    await writeFile(path, file.buffer);

    const document = await this.prisma.document.create({
      data: {
        fileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        uploadedById: userId,
      },
    });

    await this.auditService.log({
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: document.id,
      userId,
      newValue: { originalName: file.originalname, size: file.size, entityType: document.entityType, entityId: document.entityId },
    });

    return this.sanitize(document);
  }

  async findForEntity(entityType: string, entityId: string) {
    const documents = await this.prisma.document.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
    return documents.map((document) => this.sanitize(document));
  }

  async getDownload(id: string): Promise<{ document: Document; buffer: Buffer }> {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Document not found');

    const buffer = await readFile(document.path).catch(() => null);
    if (!buffer) throw new NotFoundException('Document file is missing');
    return { document, buffer };
  }

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Document not found');

    await this.prisma.document.delete({ where: { id } });
    await rm(document.path, { force: true }).catch(() => undefined);

    await this.auditService.log({
      action: 'DOCUMENT_DELETED',
      entityType: 'Document',
      entityId: id,
      userId,
    });

    return { success: true };
  }
}