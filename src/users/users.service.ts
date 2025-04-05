// src/users/users.service.ts
import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { randomBytes } from 'crypto';
import { addHours } from 'date-fns';
import { TokenBlacklistService } from 'src/auth/token-blacklist.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private tokenBlacklist: TokenBlacklistService) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const user = await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          password: hashedPassword,
          name: createUserDto.name,
        },
      });

      return this.excludePassword(user);
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        throw new ConflictException('Email already exists');
      }
      throw error; 
    }
  }

  async findAll() {
    const users = await this.prisma.user.findMany();
    return users.map(user => this.excludePassword(user));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.excludePassword(user);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const data: any = { ...updateUserDto };
    
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    return user;
  }


  async remove(id: number, token?: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id }
      });
  
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
  
      if (token) {
        await this.tokenBlacklist.addToBlacklist(
          token,
          new Date(Date.now() + 3600 * 1000) 
        );
      }
  
      await this.prisma.user.delete({ where: { id } });
      
      return {
        success: true,
        message: 'User deleted successfully'
      };
      
    } catch (error) {
      if (error.code === 'P2025') {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }


  async validateUser(email: string, password: string) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.excludePassword(user);
  }

  async initiatePasswordReset(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.findByEmail(forgotPasswordDto.email);
    if (!user) {
      // Don't reveal whether the email exists or not
      return { message: 'If an account with that email exists, a reset link has been sent' };
    }

    const resetToken = randomBytes(4).toString('hex');
    const resetTokenExpires = addHours(new Date(), 1); // Token expires in 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires },
    });

    // In a real app, you would send an email with the reset token
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    return { message: 'If an account with that email exists, a reset link has been sent' };
  }

  async completePasswordReset(resetPasswordDto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: resetPasswordDto.token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  private excludePassword(user: any) {
    const { password, resetToken, resetTokenExpires, ...result } = user;
    return result;
  }
}