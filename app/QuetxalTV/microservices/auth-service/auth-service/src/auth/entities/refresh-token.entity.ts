// ─────────────────────────────────────────────────────────────────
  //  src/auth/entities/refresh-token.entity.ts
  // ─────────────────────────────────────────────────────────────────
  
  import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';

  import { User } from './user.entity';

  
  @Entity({ name: 'refresh_tokens', schema: 'auth' })
  export class RefreshToken {
    @PrimaryGeneratedColumn('uuid', { name: 'token_id' })
    tokenId: string;
  
    @Column({ name: 'user_id' })
    userId: string;
  
    @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
  
    // Nunca guardamos el token raw — solo su hash SHA-256
    @Column({ name: 'token_hash', length: 512, unique: true })
    tokenHash: string;
  
    
@Column({
  name: 'device_info',
  type: 'varchar',  
  length: 255,
  nullable: true,
})
deviceInfo: string | null;

  
    @Column({ name: 'ip_address', type: 'inet', nullable: true })
    ipAddress: string | null;
  
    @Column({ name: 'expires_at', type: 'timestamptz' })
    expiresAt: Date;
  
    @Column({ default: false })
    revoked: boolean;
  
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
  }
  
  