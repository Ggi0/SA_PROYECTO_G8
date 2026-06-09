// src/perfil/perfil.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';
import { PerfilRepository } from './perfil.repository';
import { Profile } from './entities/profile.entity';
import { JwtModule } from '../JWT/jwt.module';

// AuthRepository se necesita en PerfilService para:
// - selectProfile → obtener datos del usuario y construir el JWT
// - createProfile / deleteProfile → obtener email para Notification Service (futuro)
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile]),
    JwtModule,
    AuthModule,   // exporta AuthService y AuthRepository
  ],
  controllers: [PerfilController],
  providers: [PerfilService, PerfilRepository],
})
export class PerfilModule {}