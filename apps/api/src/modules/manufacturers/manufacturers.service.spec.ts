import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ManufacturersService } from './manufacturers.service';

describe('ManufacturersService', () => {
  function buildService() {
    const prisma = {
      $transaction: jest.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
      manufacturer: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const service = new ManufacturersService(prisma as never, { log: jest.fn() } as never);
    return { service, prisma };
  }

  it('lists manufacturers counting only active (non-soft-deleted) products', async () => {
    const { service, prisma } = buildService();
    await service.findAll({});

    const arg = prisma.manufacturer.findMany.mock.calls[0][0] as { include: unknown };
    expect(arg.include).toEqual({ _count: { select: { products: { where: { deletedAt: null } } } } });
  });

  it('blocks deletion when products (including soft-deleted) reference the manufacturer', async () => {
    const { service, prisma } = buildService();
    prisma.manufacturer.findUnique.mockResolvedValue({ id: 'm1', name: 'PharmaCure', _count: { products: 2 } });
    await expect(service.remove('m1')).rejects.toThrow(BadRequestException);
  });

  it('throws NotFound for an unknown manufacturer', async () => {
    const { service } = buildService();
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});