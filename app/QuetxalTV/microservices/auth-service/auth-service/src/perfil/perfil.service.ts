// src/perfil/perfil.service.ts

import {
    Injectable,
    Logger,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
  } from '@nestjs/common';
  import { PerfilRepository } from './perfil.repository';
  import { JwtService } from '../JWT/jwt.service';
  import { AuthRepository } from '../auth/auth.repository';
  import { MAX_PROFILES_PER_USER } from '../common/constants';
  import type {
    ProfileDto,
    ListProfilesRequest,
    ListProfilesResponse,
    CreateProfileRequest,
    CreateProfileResponse,
    UpdateProfileRequest,
    UpdateProfileResponse,
    DeleteProfileRequest,
    DeleteProfileResponse,
    SelectProfileRequest,
    SelectProfileResponse,
  } from './perfil.contract';
  import type { Profile } from './entities/profile.entity';
  
  @Injectable()
  export class PerfilService {
    private readonly logger = new Logger(PerfilService.name);
  
    constructor(
      private readonly perfilRepository: PerfilRepository,
      private readonly authRepository: AuthRepository,
      private readonly jwtService: JwtService,
    ) {}
  
    // ─────────────────────────────────────────────
    //  Helper: Profile entity → ProfileDto
    // ─────────────────────────────────────────────
  
    private toDto(profile: Profile): ProfileDto {
      return {
        profileId:   profile.profileId,
        displayName: profile.displayName,
        avatarUrl:   profile.avatarUrl,
        isKidsMode:  profile.isKidsMode,
      };
    }
  
    // ─────────────────────────────────────────────
    //  LIST
    // ─────────────────────────────────────────────
  
    async listProfiles(req: ListProfilesRequest): Promise<ListProfilesResponse> {
      const profiles = await this.perfilRepository.findAllByUser(req.userId);
  
      return {
        profiles:   profiles.map((p) => this.toDto(p)),
        count:      profiles.length,
        maxAllowed: MAX_PROFILES_PER_USER,
      };
    }
  
    // ─────────────────────────────────────────────
    //  CREATE
    // ─────────────────────────────────────────────
  
    async createProfile(req: CreateProfileRequest): Promise<CreateProfileResponse> {
      // Validación previa (el trigger de la DB es la segunda defensa)
      const currentCount = await this.perfilRepository.countByUser(req.userId);
      if (currentCount >= MAX_PROFILES_PER_USER) {
        throw new BadRequestException(
          `Límite de perfiles alcanzado (máximo ${MAX_PROFILES_PER_USER}).`,
        );
      }
  
      const profile = await this.perfilRepository.create({
        userId:      req.userId,
        displayName: req.displayName,
        isKidsMode:  req.isKidsMode ?? false,
        avatarUrl:   req.avatarUrl,
      });
  
      this.logger.log(`Perfil creado: ${profile.profileId} → usuario ${req.userId}`);
  
      // ── INTEGRACIÓN FUTURA — Notification Service [createProfile] ──
      // Cuando el Notification Service esté disponible:
      //
      // try {
      //   const user = await this.authRepository.findById(req.userId);
      //   await this.notificationClient.sendProfileCreated({
      //     userId:      req.userId,
      //     email:       user.email,
      //     profileName: req.displayName,
      //   });
      // } catch (err) {
      //   this.logger.warn(`Notificación de perfil creado no enviada: ${err.message}`);
      // }
      // ──────────────────────────────────────────────────────────────
  
      return { profile: this.toDto(profile) };
    }
  
    // ─────────────────────────────────────────────
    //  UPDATE
    // ─────────────────────────────────────────────
  
    async updateProfile(req: UpdateProfileRequest): Promise<UpdateProfileResponse> {
      // Verificar que el perfil existe Y pertenece al usuario
      const existing = await this.perfilRepository.findByIdAndUser(
        req.profileId,
        req.userId,
      );
  
      if (!existing) {
        // Misma excepción para "no existe" y "no es tuyo" — evitar enumeración
        throw new NotFoundException('Perfil no encontrado.');
      }
  
      const updated = await this.perfilRepository.update(req.profileId, {
        displayName: req.displayName,
        avatarUrl:   req.avatarUrl,
        isKidsMode:  req.isKidsMode,
      });
  
      this.logger.log(`Perfil actualizado: ${req.profileId}`);
  
      return { profile: this.toDto(updated) };
    }
  
    // ─────────────────────────────────────────────
    //  DELETE
    // ─────────────────────────────────────────────
  
    async deleteProfile(req: DeleteProfileRequest): Promise<DeleteProfileResponse> {
      // 1. Verificar que el perfil existe y pertenece al usuario
      const existing = await this.perfilRepository.findByIdAndUser(
        req.profileId,
        req.userId,
      );
  
      if (!existing) {
        throw new NotFoundException('Perfil no encontrado.');
      }
  
      // 2. No se puede eliminar el único perfil restante
      const count = await this.perfilRepository.countByUser(req.userId);
      if (count <= 1) {
        throw new BadRequestException(
          'No se puede eliminar el único perfil. Crea otro primero.',
        );
      }
  
      await this.perfilRepository.delete(req.profileId);
  
      this.logger.log(`Perfil eliminado: ${req.profileId} → usuario ${req.userId}`);
  
      // ── INTEGRACIÓN FUTURA — Notification Service [deleteProfile] ──
      // try {
      //   const user = await this.authRepository.findById(req.userId);
      //   await this.notificationClient.sendSecurityAlert({
      //     userId:    req.userId,
      //     email:     user.email,
      //     eventType: 'PROFILE_DELETED',
      //     ipAddress: '',
      //     metadata:  JSON.stringify({ profileId: req.profileId }),
      //   });
      // } catch (err) {
      //   this.logger.warn(`Alerta de perfil eliminado no enviada: ${err.message}`);
      // }
      // ──────────────────────────────────────────────────────────────
  
      return { message: 'Perfil eliminado correctamente.' };
    }
  
    // ─────────────────────────────────────────────
    //  SELECT  (activa un perfil → emite nuevo JWT)
    // ─────────────────────────────────────────────
  
    async selectProfile(req: SelectProfileRequest): Promise<SelectProfileResponse> {
      // 1. Verificar que el perfil existe y pertenece al usuario
      const profile = await this.perfilRepository.findByIdAndUser(
        req.profileId,
        req.userId,
      );
  
      if (!profile) {
        throw new NotFoundException('Perfil no encontrado o no pertenece al usuario.');
      }
  
      // 2. Obtener datos del usuario para construir el JWT
      const user = await this.authRepository.findById(req.userId);
      if (!user || !user.isActive) {
        throw new ForbiddenException('Usuario no disponible.');
      }
  
      // 3. Emitir nuevo access token con active_profile_id
      const accessToken = this.jwtService.signAccessToken({
        sub:             user.userId,
        email:           user.email,
        role:            user.role,
        tokenVersion:    user.tokenVersion,
        activeProfileId: profile.profileId,
      });
  
      this.logger.log(
        `Perfil activo seleccionado: ${profile.profileId} → usuario ${user.userId}`,
      );
  
      return {
        accessToken,
        activeProfile: this.toDto(profile),
      };
    }
  }