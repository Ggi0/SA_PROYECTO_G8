// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { VerificationToken } from './entities/verification-token.entity';
import { JwtModule } from '../JWT/jwt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, VerificationToken]),
    JwtModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
  exports: [AuthService],
})
export class AuthModule {}