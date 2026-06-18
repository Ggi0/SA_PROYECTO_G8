import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'audit_trail', schema: 'auth' })
export class AuditTrail {
  @PrimaryGeneratedColumn({ name: 'audit_id', type: 'bigint' })
  auditId: string;

  @Column({ name: 'table_name', type: 'text' })
  tableName: string;

  @Column({ name: 'operation', type: 'varchar', length: 10 })
  operation: 'INSERT' | 'UPDATE' | 'DELETE';

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'record_id', type: 'text', nullable: true })
  recordId: string | null;

  @Column({ name: 'old_data', type: 'jsonb', nullable: true })
  oldData: Record<string, any> | null;

  @Column({ name: 'new_data', type: 'jsonb', nullable: true })
  newData: Record<string, any> | null;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt: Date;
}
