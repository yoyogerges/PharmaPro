import { Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Pharmacy, SystemSetting } from '@prisma/client';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logoDir = resolve(process.cwd(), 'uploads', 'logo');

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    await mkdir(this.logoDir, { recursive: true });
  }

  async getPharmacy(): Promise<Pharmacy | null> {
    return this.prisma.pharmacy.findFirst();
  }

  async getPublicProfile(): Promise<Pick<Pharmacy, 'name' | 'nameAr' | 'currency' | 'taxNumber'> | null> {
    return this.prisma.pharmacy.findFirst({
      select: { name: true, nameAr: true, currency: true, taxNumber: true },
    });
  }

  async updatePharmacy(body: Record<string, unknown>): Promise<Pharmacy> {
    const data = this.extractPharmacyData(body);
    const existing = await this.prisma.pharmacy.findFirst();
    const pharmacy = existing
      ? await this.prisma.pharmacy.update({ where: { id: existing.id }, data })
      : await this.prisma.pharmacy.create({ data: data as never });

    void this.auditService.log({
      action: 'settings.updatePharmacy',
      entityType: 'Pharmacy',
      entityId: pharmacy.id,
      previousValue: existing ? { name: existing.name } : undefined,
      newValue: { name: pharmacy.name },
    });

    return pharmacy;
  }

  async uploadLogo(file: Express.Multer.File): Promise<Pharmacy> {
    const ext = extname(file.originalname).slice(0, 12);
    const fileName = `logo-${randomUUID()}${ext}`;
    const path = join(this.logoDir, fileName);
    await writeFile(path, file.buffer);

    const existing = await this.prisma.pharmacy.findFirst();
    let previousLogo: string | null = null;
    let pharmacy: Pharmacy;
    if (existing) {
      previousLogo = existing.logo;
      pharmacy = await this.prisma.pharmacy.update({ where: { id: existing.id }, data: { logo: fileName } });
    } else {
      pharmacy = await this.prisma.pharmacy.create({ data: { name: 'Pharmacy', logo: fileName } as never });
    }

    if (previousLogo) {
      await import('node:fs/promises').then((fs) => fs.rm(join(this.logoDir, previousLogo), { force: true }).catch(() => undefined));
    }

    void this.auditService.log({
      action: 'settings.uploadLogo',
      entityType: 'Pharmacy',
      entityId: pharmacy.id,
      previousValue: previousLogo ? { logo: previousLogo } : undefined,
      newValue: { logo: fileName },
    });

    return pharmacy;
  }

  async getLogo(): Promise<{ buffer: Buffer; mimeType: string }> {
    const pharmacy = await this.prisma.pharmacy.findFirst();
    if (!pharmacy?.logo) throw new NotFoundException('No logo uploaded');
    const buffer = await readFile(join(this.logoDir, pharmacy.logo)).catch(() => null);
    if (!buffer) throw new NotFoundException('Logo file is missing');
    const ext = extname(pharmacy.logo).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream';
    return { buffer, mimeType: mime };
  }

  async findAll(): Promise<{ pharmacy: Pharmacy | null; settings: SystemSetting[] }> {
    const [pharmacy, settings] = await this.prisma.$transaction([
      this.prisma.pharmacy.findFirst(),
      this.prisma.systemSetting.findMany({ orderBy: { group: 'asc' } }),
    ]);
    return { pharmacy, settings };
  }

  async update(body: Record<string, unknown>): Promise<{ pharmacy: Pharmacy | null; settings: SystemSetting[] }> {
    const pharmacyData = this.extractPharmacyData(body);
    if (Object.keys(pharmacyData).length > 0) {
      const existing = await this.prisma.pharmacy.findFirst();
      if (existing) {
        await this.prisma.pharmacy.update({ where: { id: existing.id }, data: pharmacyData });
      } else {
        await this.prisma.pharmacy.create({ data: pharmacyData as never });
      }
    }

    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith('settings.')) {
        const settingKey = key.slice('settings.'.length);
        const stringValue = this.coerceToString(value);
        await this.prisma.systemSetting.upsert({
          where: { key: settingKey },
          create: { key: settingKey, value: stringValue },
          update: { value: stringValue },
        });
      }
    }

    return this.findAll();
  }

  private extractPharmacyData(body: Record<string, unknown>): Partial<Pharmacy> {
    const out: Record<string, unknown> = {};
    const pharmacyKeys = ['name', 'nameAr', 'address', 'addressAr', 'phone', 'email', 'taxNumber', 'currency', 'timezone'] as const;
    for (const key of pharmacyKeys) {
      if (key in body && body[key] !== undefined) {
        out[key] = String(body[key]);
      }
    }
    return out;
  }

  private coerceToString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return JSON.stringify(value);
  }
}