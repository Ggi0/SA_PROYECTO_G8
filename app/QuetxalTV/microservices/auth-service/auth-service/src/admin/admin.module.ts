import { Module } from '@nestjs/common';
import { AuditService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuditRepository } from './admin.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditTrail } from './entity/audit-trail.entity';

@Module({

  imports: [
    TypeOrmModule.forFeature([AuditTrail]), // 
  ],

  controllers: [AdminController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AdminModule {}