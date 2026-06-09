// src/perfil/perfil.repository.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Profile } from './entities/profile.entity';


@Injectable()
export class PerfilRepository {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,

    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────
  //  LISTAR perfiles de un usuario
  // ─────────────────────────────────────────────

  async findAllByUser(userId: string): Promise<Profile[]> {
    return this.profileRepo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  // ─────────────────────────────────────────────
  //  BUSCAR perfil por ID
  // ─────────────────────────────────────────────

  async findById(profileId: string): Promise<Profile | null> {
    return this.profileRepo.findOne({ where: { profileId } });
  }

  // ─────────────────────────────────────────────
  //  BUSCAR perfil por ID validando que pertenezca al usuario
  // ─────────────────────────────────────────────

  async findByIdAndUser(
    profileId: string,
    userId: string,
  ): Promise<Profile | null> {
    return this.profileRepo.findOne({ where: { profileId, userId } });
  }

  // ─────────────────────────────────────────────
  //  CONTAR perfiles de un usuario
  //  Usa fn_count_profiles de la DB (mismo que el trigger)
  // ─────────────────────────────────────────────

  async countByUser(userId: string): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT auth.fn_count_profiles($1) AS count`,
      [userId],
    );
    return parseInt(result[0]?.count ?? '0', 10);
  }

  // ─────────────────────────────────────────────
  //  CREAR perfil
  //  El trigger trg_limit_profiles_per_user valida el límite de 5
  //  en la DB como segunda línea de defensa.
  // ─────────────────────────────────────────────

  async create(params: {
    userId:      string;
    displayName: string;
    isKidsMode?: boolean;
    avatarUrl?:  string;
  }): Promise<Profile> {
    const profile = this.profileRepo.create({
      userId:      params.userId,
      displayName: params.displayName,
      isKidsMode:  params.isKidsMode ?? false,
      avatarUrl:   params.avatarUrl ?? null,
    });
    return this.profileRepo.save(profile);
  }

  // ─────────────────────────────────────────────
  //  ACTUALIZAR perfil
  //  Solo actualiza los campos que vienen definidos (no vacíos).
  // ─────────────────────────────────────────────

  async update(
    profileId: string,
    fields: {
      displayName?: string;
      avatarUrl?:   string;
      isKidsMode?:  boolean;
    },
  ): Promise<Profile> {
    const toUpdate: {
      displayName?: string;
      avatarUrl?: string | null;
      isKidsMode?: boolean;
    } = {};

    if (fields.displayName !== undefined && fields.displayName !== '') {
      toUpdate.displayName = fields.displayName;
    }
    if (fields.avatarUrl !== undefined) {
      // Permitir string vacío para "quitar avatar"
      toUpdate.avatarUrl = fields.avatarUrl === '' ? null : fields.avatarUrl;
    }
    if (fields.isKidsMode !== undefined) {
      toUpdate.isKidsMode = fields.isKidsMode;
    }

await this.profileRepo.update(
  { profileId },
  toUpdate,
);

    // Devolver el perfil actualizado
    return this.profileRepo.findOneOrFail({ where: { profileId } });
  }

  // ─────────────────────────────────────────────
  //  ELIMINAR perfil
  // ─────────────────────────────────────────────

  async delete(profileId: string): Promise<void> {
    await this.profileRepo.delete({ profileId });
  }
}