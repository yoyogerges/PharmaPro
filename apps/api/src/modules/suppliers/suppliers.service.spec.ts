import { SuppliersService } from './suppliers.service';

const dec = (value: number) => ({ toNumber: () => value } as never);

describe('SuppliersService.statement', () => {
  const supplier = { id: 's1', name: 'ACME', phone: null, email: null, openingBalance: dec(100), currentBalance: dec(90), createdAt: new Date('2026-01-01') };

  function buildService(data: { receipts?: unknown[]; returns?: unknown[]; payments?: unknown[] }) {
    const prisma = {
      supplier: { findUnique: jest.fn().mockResolvedValue(supplier) },
      purchaseReceipt: { findMany: jest.fn().mockResolvedValue(data.receipts ?? []) },
      purchaseReturn: { findMany: jest.fn().mockResolvedValue(data.returns ?? []) },
      payment: { findMany: jest.fn().mockResolvedValue(data.payments ?? []) },
      $transaction: jest.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
    };
    const service = new SuppliersService(prisma as never, { log: jest.fn() } as never);
    return service;
  }

  it('builds a chronological ledger with running balances', async () => {
    const service = buildService({
      receipts: [
        { id: 'r1', receiptDate: new Date('2026-01-10'), receiptNumber: 'PR-1', invoiceNumber: 'INV-1', totalAmount: dec(50) },
      ],
      returns: [{ id: 'rt1', returnDate: new Date('2026-01-20'), returnNumber: 'PUR-RET-1', totalAmount: dec(10), reason: 'damaged' }],
      payments: [{ id: 'p1', date: new Date('2026-01-15'), reference: 'PAY-1', amount: dec(20), notes: null }],
    });

    const result = await service.statement('s1', {});

    expect(result.transactions.map((t) => t.type)).toEqual(['OPENING', 'PURCHASE', 'PAYMENT', 'RETURN']);
    expect(result.transactions.map((t) => t.balanceAfter)).toEqual([100, 150, 130, 120]);

    expect(result.summary).toEqual({
      openingBalance: 100,
      currentBalance: 90,
      calculatedBalance: 120,
      totalPurchases: 50,
      totalPayments: 20,
      totalReturns: 10,
    });
  });

  it('returns an empty ledger (opening only) when there are no documents', async () => {
    const service = buildService({});
    const result = await service.statement('s1', {});
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({ type: 'OPENING', balanceAfter: 100 });
    expect(result.summary.calculatedBalance).toBe(100);
  });

  it('throws on an invalid date range', async () => {
    const service = buildService({});
    await expect(service.statement('s1', { dateFrom: 'not-a-date' })).rejects.toThrow();
  });
});