import { Injectable, type LoggerService, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy, LoggerService {
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  log(_message: string) {}
  warn(_message: string) {}
  error(_message: string) {}
  debug() {}
  verbose() {}
}