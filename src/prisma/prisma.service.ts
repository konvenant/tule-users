// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, BadGatewayException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      throw BadGatewayException;
    }
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}