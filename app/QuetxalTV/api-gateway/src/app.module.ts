import { Module } from '@nestjs/common';
import { SubscriptionModule } from './subscription/subscription.module';
import { FxModule } from './fx/fx.module';

@Module({
  imports: [SubscriptionModule, FxModule],
})
export class AppModule {}
