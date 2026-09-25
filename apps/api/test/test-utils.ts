import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

export async function createTestApp(moduleToken: unknown): Promise<{
  app: INestApplication;
  server: App;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [moduleToken as never],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return { app, server: app.getHttpServer() };
}

export const requestWith = request;