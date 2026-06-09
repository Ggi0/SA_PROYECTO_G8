import { Module } from '@nestjs/common';
import { SubscriptionModule } from './subscription/subscription.module';
import { AuthModule } from './auth/auth.module';


@Module({
  imports: [SubscriptionModule, AuthModule],
})
export class AppModule {}
