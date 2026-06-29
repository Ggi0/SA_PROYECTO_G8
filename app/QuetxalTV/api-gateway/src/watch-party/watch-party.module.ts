import { Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { WatchPartyController } from './watch-party.controller';
import { WatchPartyGateway } from './watch-party.gateway';
import { WatchPartyService } from './watch-party.service';
import { PremiumGuard } from './premium.guard';

@Module({
  imports: [SubscriptionModule],
  controllers: [WatchPartyController],
  providers: [WatchPartyService, WatchPartyGateway, PremiumGuard],
})
export class WatchPartyModule {}
