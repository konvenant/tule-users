import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokenBlacklistService {
  constructor(private prisma: PrismaService) {}

  async addToBlacklist(token: string, expiresAt: Date): Promise<void> {
    await this.prisma.blacklistedToken.create({
      data: {
        token,
        expiresAt
      }
    });
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const found = await this.prisma.blacklistedToken.findFirst({
      where: { token }
    });
    return !!found;
  }
}