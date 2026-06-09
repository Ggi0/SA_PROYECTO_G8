// src/perfil/perfil.controller.ts

import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PerfilService } from './perfil.service';
import type {
  ListProfilesRequest,
  CreateProfileRequest,
  UpdateProfileRequest,
  DeleteProfileRequest,
  SelectProfileRequest,
} from './perfil.contract';

// Todos los métodos están declarados en auth.proto → service AuthService
// El nombre del servicio en @GrpcMethod debe coincidir exactamente.
@Controller()
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  // GET /auth/profiles
  @GrpcMethod('AuthService', 'ListProfiles')
  listProfiles(data: ListProfilesRequest) {
    return this.perfilService.listProfiles(data);
  }

  // POST /auth/profiles
  @GrpcMethod('AuthService', 'CreateProfile')
  createProfile(data: CreateProfileRequest) {
    return this.perfilService.createProfile(data);
  }

  // PATCH /auth/profiles/:id
  @GrpcMethod('AuthService', 'UpdateProfile')
  updateProfile(data: UpdateProfileRequest) {
    return this.perfilService.updateProfile(data);
  }

  // DELETE /auth/profiles/:id
  @GrpcMethod('AuthService', 'DeleteProfile')
  deleteProfile(data: DeleteProfileRequest) {
    return this.perfilService.deleteProfile(data);
  }

  // POST /auth/profiles/select
  @GrpcMethod('AuthService', 'SelectProfile')
  selectProfile(data: SelectProfileRequest) {
    return this.perfilService.selectProfile(data);
  }
}