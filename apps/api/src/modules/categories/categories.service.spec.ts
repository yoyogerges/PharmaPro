import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  function buildService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      productCategory: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      ...overrides,
    };
    const service = new CategoriesService(prisma as never, { log: jest.fn() } as never);
    return { service, prisma };
  }

  it('lists categories counting only active (non-soft-deleted) products', async () => {
    const { service, prisma } = buildService();
    await service.findAll();

    const arg = prisma.productCategory.findMany.mock.calls[0][0] as { include: unknown };
    expect(arg.include).toEqual({ _count: { select: { products: { where: { deletedAt: null } } } } });
  });

  it('reads a category counting only active (non-soft-deleted) products', async () => {
    const { service, prisma } = buildService();
    prisma.productCategory.findUnique.mockResolvedValue({
      id: 'c1',
      name: 'Analgesics',
      createdAt: new Date('2026-01-01'),
      _count: { products: 1 },
    });

    await service.findOne('c1');

    const arg = prisma.productCategory.findUnique.mock.calls[0][0] as { include: unknown };
    expect(arg.include).toEqual({ _count: { select: { products: { where: { deletedAt: null } } } } });
  });
});