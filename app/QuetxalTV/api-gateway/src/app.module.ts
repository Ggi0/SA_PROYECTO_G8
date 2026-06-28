import { Module } from '@nestjs/common';
import { SubscriptionModule } from './subscription/subscription.module';
import { FxModule } from './fx/fx.module';
import { CatalogModule } from './catalog/catalog.module';
import { AuthModule } from './auth/auth.module';
import { HistorialModule } from './historial/historial.module';
import { HealthController } from './health.controller';
import { AuditModule } from './audit/audit.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [SubscriptionModule, FxModule, CatalogModule, AuthModule, HistorialModule, AuditModule, MetricsModule],
  controllers: [HealthController],
})
export class AppModule {}
