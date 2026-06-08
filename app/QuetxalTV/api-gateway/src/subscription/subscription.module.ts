import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'SUBSCRIPTION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'subscription',
          protoPath: join(__dirname, '../proto/subscription.proto'),
          url: process.env.SUBSCRIPTION_SERVICE_URL || 'subscription-service:50053',
        },
      },
    ]),
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
})
export class SubscriptionModule {}
