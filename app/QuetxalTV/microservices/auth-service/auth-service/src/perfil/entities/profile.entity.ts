// ─────────────────────────────────────────────────────────────────
  //  src/perfil/entities/profile.entity.ts
  // ─────────────────────────────────────────────────────────────────
  
  import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';

  import { User } from '../../auth/entities/user.entity';
  
  @Entity({ name: 'profiles', schema: 'auth' })
  export class Profile {
    @PrimaryGeneratedColumn('uuid', { name: 'profile_id' })
    profileId: string;
  
    @Column({ name: 'user_id' })
    userId: string;
  
    @ManyToOne(() => User, (user) => user.profiles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
  
    @Column({ name: 'display_name', length: 100 })
    displayName: string;
  
    
@Column({
  name: 'avatar_url',
  type: 'varchar',   
  length: 500,
  nullable: true,
})
avatarUrl: string | null;

  
    @Column({ type: 'jsonb', default: '{}' })
    preferences: Record<string, unknown>;
  
    @Column({ name: 'is_kids_mode', default: false })
    isKidsMode: boolean;

    @Column({ name: 'parental_pin', type: 'varchar', length: 255, nullable: true })
    parentalPin: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
  }