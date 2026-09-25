import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type DocumentKind = 'purchaseOrder' | 'purchaseReceipt' | 'purchaseReturn' | 'sale' | 'saleReturn' | 'prescription';

const DEFAULT_PREFIX: Record<DocumentKind, string> = {
  purchaseOrder: 'PO',
  purchaseReceipt: 'RCV',
  purchaseReturn: 'PRN',
  sale: 'POS',
  saleReturn: 'SRN',
  prescription: 'PCS',
};

const SETTING_KEY: Partial<Record<DocumentKind, string>> = {
  purchaseOrder: 'po_prefix',
  sale: 'pos_prefix',
};

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

@Injectable()
export class NumberingService {
  private readonly logger = new Logger(NumberingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(kind: DocumentKind, date = new Date()): Promise<string> {
    const prefix = await this.resolvePrefix(kind);
    const base = `${prefix}-${ymd(date)}-`;

    let max = 0;
    const takeLast = (num: string) => {
      const seq = Number.parseInt(num.slice(base.length), 10);
      if (!Number.isNaN(seq) && seq > max) max = seq;
    };

    if (kind === 'purchaseOrder') {
      const rows = await this.prisma.purchaseOrder.findMany({
        where: { poNumber: { startsWith: base } },
        select: { poNumber: true },
      });
      rows.forEach((row) => takeLast(row.poNumber));
    } else if (kind === 'purchaseReceipt') {
      const rows = await this.prisma.purchaseReceipt.findMany({
        where: { receiptNumber: { startsWith: base } },
        select: { receiptNumber: true },
      });
      rows.forEach((row) => takeLast(row.receiptNumber));
    } else if (kind === 'purchaseReturn') {
      const rows = await this.prisma.purchaseReturn.findMany({
        where: { returnNumber: { startsWith: base } },
        select: { returnNumber: true },
      });
      rows.forEach((row) => takeLast(row.returnNumber));
    } else if (kind === 'sale') {
      const rows = await this.prisma.sale.findMany({
        where: { invoiceNumber: { startsWith: base } },
        select: { invoiceNumber: true },
      });
      rows.forEach((row) => takeLast(row.invoiceNumber));
    } else if (kind === 'prescription') {
      const rows = await this.prisma.prescription.findMany({
        where: { prescriptionNumber: { startsWith: base } },
        select: { prescriptionNumber: true },
      });
      rows.forEach((row) => takeLast(row.prescriptionNumber));
    } else {
      const rows = await this.prisma.salesReturn.findMany({
        where: { returnNumber: { startsWith: base } },
        select: { returnNumber: true },
      });
      rows.forEach((row) => takeLast(row.returnNumber));
    }

    return `${base}${String(max + 1).padStart(4, '0')}`;
  }

  private async resolvePrefix(kind: DocumentKind): Promise<string> {
    const settingKey = SETTING_KEY[kind];
    if (settingKey) {
      const setting = await this.prisma.systemSetting.findUnique({ where: { key: settingKey } });
      if (setting?.value) return setting.value.trim().toUpperCase();
    }
    return DEFAULT_PREFIX[kind];
  }
}