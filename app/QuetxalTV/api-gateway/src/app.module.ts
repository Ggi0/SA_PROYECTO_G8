import { Module } from '@nestjs/common';
import { SubscriptionModule } from './subscription/subscription.module';
import { FxModule } from './fx/fx.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [SubscriptionModule, FxModule, CatalogModule],
})
export class AppModule {}
