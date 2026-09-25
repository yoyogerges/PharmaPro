import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CashMovementType, Prisma } from '@prisma/client';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMovementDto, OpenRegisterDto } from './dto/cash-register.dto';

const r2 = (n: number) => Math.round(n * 100) / 100;

const INFLOW_TYPES: CashMovementType[] = ['SALE', 'DEPOSIT', 'ADJUSTMENT'];
const OUTFLOW_TYPES: CashMovementType[] = ['SALE_REFUND', 'EXPENSE', 'WITHDRAWAL'];

@Injectable()
export class CashRegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listRegisters() {
    const rows = await this.prisma.cashRegister.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    return rows.map((row) => ({ id: row.id, name: row.name, isActive: row.isActive }));
  }

  async open(dto: OpenRegisterDto, request?: Request) {
    const userId = this.currentUserId(request);
    if (!userId) throw new BadRequestException('User not identified');

    const register = await this.prisma.cashRegister.findUnique({ where: { id: dto.cashRegisterId } });
    if (!register || !register.isActive) throw new NotFoundException('Cash register not found');

    const openSession = await this.prisma.cashSession.findFirst({ where: { cashRegisterId: dto.cashRegisterId, status: 'OPEN' } });
    if (openSession) throw new ConflictException('A session is already open for this register');

    const session = await this.prisma.cashSession.create({
      data: {
        cashRegisterId: dto.cashRegisterId,
        userId,
        openingBalance: dto.openingBalance,
        openedAt: new Date(),
        status: 'OPEN',
        notes: dto.notes,
      },
      include: { cashRegister: true, user: { select: { id: true, firstName: true, lastName: true } }, movements: true },
    });

    void this.auditService.log({
      action: 'cash_register.open',
      entityType: 'CashSession',
      entityId: session.id,
      newValue: { cashRegisterId: dto.cashRegisterId, openingBalance: dto.openingBalance },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toSession(session);
  }

  async close(dto: { closingBalance: number; notes?: string }, request?: Request) {
    const userId = this.currentUserId(request);
    const session = await this.findOpenSession(userId);
    if (!session) throw new BadRequestException('No open cash session for this user');

    const totals = await this.sessionTotals(session.id);
    const expected = r2(session.openingBalance.toNumber() + totals.inflow - totals.outflow);
    const difference = r2(expected - dto.closingBalance);

    const updated = await this.prisma.cashSession.update({
      where: { id: session.id },
      data: {
        closingBalance: dto.closingBalance,
        expectedClosingBalance: expected,
        closedAt: new Date(),
        status: 'CLOSED',
        notes: dto.notes ?? session.notes,
      },
      include: { cashRegister: true, user: { select: { id: true, firstName: true, lastName: true } }, movements: true },
    });

    void this.auditService.log({
      action: 'cash_register.close',
      entityType: 'CashSession',
      entityId: session.id,
      newValue: { closingBalance: dto.closingBalance, expectedClosingBalance: expected, difference },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return { ...this.toSession(updated), totals, expectedClosingBalance: expected, difference };
  }

  async currentSession(request?: Request) {
    const userId = this.currentUserId(request);
    const session = await this.findOpenSession(userId);
    if (!session) return null;
    return this.toSession(await this.withTotals(session));
  }

  async movements(request?: Request, sessionId?: string) {
    const userId = this.currentUserId(request);
    const session = sessionId ? await this.verifySessionOwnership(sessionId, userId) : await this.findOpenSession(userId);
    if (!session) return { items: [], session: null };
    const rows = await this.prisma.cashMovement.findMany({ where: { cashSessionId: session.id }, orderBy: { createdAt: 'desc' } });
    return {
      session: this.toSession(session),
      items: rows.map((row) => ({ id: row.id, type: row.type, amount: row.amount.toNumber(), referenceType: row.referenceType, referenceId: row.referenceId, description: row.description, createdAt: row.createdAt })),
    };
  }

  async summary(request?: Request) {
    const userId = this.currentUserId(request);
    const session = await this.findOpenSession(userId);
    if (!session) {
      const last = await this.prisma.cashSession.findFirst({ where: { userId }, orderBy: { openedAt: 'desc' }, include: { cashRegister: true } });
      if (!last) return null;
      const totals = await this.sessionTotals(last.id);
      const expected = r2(last.openingBalance.toNumber() + totals.inflow - totals.outflow);
      return { session: this.toSession(last), totals, expectedClosingBalance: last.status === 'CLOSED' ? Number(last.expectedClosingBalance ?? 0) : expected, difference: last.status === 'CLOSED' && last.closingBalance ? r2(Number(last.expectedClosingBalance ?? 0) - last.closingBalance.toNumber()) : null };
    }
    return this.withTotals(this.toSession(session));
  }

  async addMovement(
    userId: string,
    type: CashMovementType,
    amount: number,
    referenceType?: string,
    referenceId?: string,
    description?: string,
  ) {
    const session = await this.findOpenSession(userId);
    if (!session) return null;
    return this.prisma.cashMovement.create({
      data: {
        cashSessionId: session.id,
        type,
        amount: r2(amount),
        referenceType,
        referenceId,
        description,
      },
    });
  }

  async createMovement(dto: CreateMovementDto, request?: Request) {
    const userId = this.currentUserId(request);
    if (!userId) throw new BadRequestException('User not identified');
    if (dto.type === 'SALE' || dto.type === 'SALE_REFUND') {
      throw new BadRequestException(`${dto.type} movements are created automatically from sales`);
    }
    const movement = await this.addMovement(userId, dto.type, dto.amount, undefined, undefined, dto.description);
    if (!movement) throw new BadRequestException('No open cash session for this user');

    void this.auditService.log({
      action: 'cash_register.movement',
      entityType: 'CashMovement',
      entityId: movement.id,
      newValue: { type: dto.type, amount: dto.amount },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return movement;
  }

  // ── Helpers ─────────────────────────────────────────────────

  async findOpenSession(userId?: string) {
    if (!userId) return null;
    return this.prisma.cashSession.findFirst({ where: { userId, status: 'OPEN' }, orderBy: { openedAt: 'desc' } });
  }

  private async verifySessionOwnership(sessionId: string, userId?: string) {
    const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new NotFoundException('Cash session not found');
    return session;
  }

  private async sessionTotals(sessionId: string) {
    const rows = await this.prisma.cashMovement.findMany({ where: { cashSessionId: sessionId }, select: { type: true, amount: true } });
    let inflow = 0;
    let outflow = 0;
    for (const row of rows) {
      if (INFLOW_TYPES.includes(row.type)) inflow += row.amount.toNumber();
      else if (OUTFLOW_TYPES.includes(row.type)) outflow += row.amount.toNumber();
    }
    return { inflow: r2(inflow), outflow: r2(outflow) };
  }

  private async withTotals(session: any) {
    const totals = await this.sessionTotals(session.id);
    const expected = r2(Number(session.openingBalance ?? 0) + totals.inflow - totals.outflow);
    return { ...session, totals, expectedClosingBalance: expected, difference: session.closingBalance !== null && session.closingBalance !== undefined ? r2(expected - Number(session.closingBalance)) : null };
  }

  private toSession(row: any) {
    return {
      id: row.id,
      cashRegisterId: row.cashRegisterId,
      userId: row.userId,
      openingBalance: row.openingBalance.toNumber(),
      closingBalance: row.closingBalance ? row.closingBalance.toNumber() : null,
      expectedClosingBalance: row.expectedClosingBalance ? row.expectedClosingBalance.toNumber() : null,
      openedAt: row.openedAt,
      closedAt: row.closedAt,
      status: row.status,
      notes: row.notes,
      cashRegister: row.cashRegister ? { id: row.cashRegister.id, name: row.cashRegister.name } : undefined,
      user: row.user ? { id: row.user.id, firstName: row.user.firstName, lastName: row.user.lastName } : undefined,
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}