  
  
// ─────────────────────────────────────────────────────────────────
  //  src/auth/entities/verification-token.entity.ts
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
  
  @Entity({ name: 'verification_tokens', schema: 'auth' })
  export class VerificationToken {
    @PrimaryGeneratedColumn('uuid', { name: 'verification_token_id' })
    verificationTokenId: string;
  
    @Column({ name: 'user_id' })
    userId: string;
  
    @ManyToOne(() => User, (user) => user.verificationTokens, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id' })
    user: User;
  
    @Column({ name: 'token_hash', length: 512, unique: true })
    tokenHash: string;
  
    @Column({ name: 'expires_at', type: 'timestamptz' })
    expiresAt: Date;
  
    @Column({ default: false })
    used: boolean;
  
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
  }
  
  