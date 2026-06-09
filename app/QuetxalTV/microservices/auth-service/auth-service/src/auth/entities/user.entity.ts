// ─────────────────────────────────────────────────────────────────
//  src/auth/entities/user.entity.ts
// ─────────────────────────────────────────────────────────────────

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
  } from 'typeorm';
  import { Profile } from '../../perfil/entities/profile.entity';
  import { RefreshToken } from './refresh-token.entity';
  import { VerificationToken } from './verification-token.entity';
  
  @Entity({ name: 'users', schema: 'auth' })
  export class User {
    @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
    userId: string;
  
    @Column({ length: 255, unique: true })
    email: string;
  
    @Column({
      name: 'password_hash',
      type: 'varchar',   
      length: 255,
      nullable: true,
    })
    passwordHash: string | null;
  

    @Column({
      name: 'oauth_provider',
      type: 'varchar',
      length: 50,
      nullable: true,
    })
    oauthProvider: string | null;
    
    @Column({
      name: 'oauth_sub',
      type: 'varchar',
      length: 255,
      nullable: true,
    })
    oauthSub: string | null;
    
  
    @Column({
      type: 'varchar',
      length: 20,
      default: 'client',
    })
    role: 'client' | 'admin';
  
    @Column({ name: 'is_active', default: false })
    isActive: boolean;
  
    // token_version se usa para invalidar todos los JWT de una sola vez
    // sin tocar la tabla refresh_tokens (incrementar = todos los tokens viejos inválidos)
    @Column({ name: 'token_version', default: 1 })
    tokenVersion: number;
  
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
  
    @OneToMany(() => Profile, (profile) => profile.user)
    profiles: Profile[];
  
    @OneToMany(() => RefreshToken, (rt) => rt.user)
    refreshTokens: RefreshToken[];
  
    @OneToMany(() => VerificationToken, (vt) => vt.user)
    verificationTokens: VerificationToken[];
  }
  
