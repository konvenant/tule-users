import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { TokenBlacklistService } from './token-blacklist.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private tokenBlacklist: TokenBlacklistService
  ) {}

  async validateCredentials(email: string, password: string): Promise<any> {
    try {
      const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedException({
        error: 'Invalid credentials',
        message: 'The email or password you entered is incorrect'
      });
    }

    console.log("User:",user.password,password);
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        error: 'Invalid credentials', 
        message: 'The email or password you entered is incorrect'
      });
    }

    const { password: _, ...result } = user;
    console.log(result);
    
    return result;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      console.log("Error1:",error);
      
      // For any other unexpected errors
      throw new UnauthorizedException({
        error: 'Login failed',
        message: 'An error occurred during login'
      });
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.validateCredentials(loginDto.email, loginDto.password);
      const payload = { 
        email: user.email, 
        sub: user.id,
        name: user.name 
      };
      
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      };
    } catch (error) {
      throw error; 
    }
  }

  
  async logout(token: string): Promise<void> {
    const decoded = this.jwtService.decode(token);
    await this.tokenBlacklist.addToBlacklist(
      token,
      new Date(decoded['exp'] * 1000)
    );
  }
}