import { Module } from '@nestjs/common';
import { SubscriptionModule } from './subscription/subscription.module';
import { FxModule } from './fx/fx.module';
import { AuthModule } from './auth/auth.module';


@Module({
  imports: [SubscriptionModule, FxModule, AuthModule],
})
export class AppModule {}
