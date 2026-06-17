import { Module } from '@nestjs/common';
import { SubscriptionModule } from './subscription/subscription.module';
import { FxModule } from './fx/fx.module';
import { CatalogModule } from './catalog/catalog.module';
import { AuthModule } from './auth/auth.module';
import { HistorialModule } from './historial/historial.module';

@Module({
  imports: [SubscriptionModule, FxModule, CatalogModule, AuthModule, HistorialModule],
})

export class AppModule {}