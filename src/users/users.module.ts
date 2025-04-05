import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenBlacklistService } from 'src/auth/token-blacklist.service';

@Module({
  imports: [PrismaModule], 
  controllers: [UsersController],
  providers: [UsersService,TokenBlacklistService],
  exports: [UsersService],
})
export class UsersModule {}