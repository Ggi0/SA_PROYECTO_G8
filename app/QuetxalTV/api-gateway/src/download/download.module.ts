import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { DownloadController } from './download.controller';
import { DownloadService } from './download.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'DOWNLOAD_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'download',
          protoPath: join(__dirname, '../proto/download.proto'),
          url: process.env.DOWNLOAD_SERVICE_URL || 'localhost:50057',
        },
      },
    ]),
  ],
  controllers: [DownloadController],
  providers: [DownloadService],
})
export class DownloadModule {}
