import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

@Injectable()
export class NotificationClient implements OnModuleInit {
  private readonly logger = new Logger(NotificationClient.name);
  private client: any;

  onModuleInit() {
    const PROTO_PATH = path.join(__dirname, '../proto/notification.proto');

    const packageDef = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const proto = grpc.loadPackageDefinition(packageDef) as any;
    const host = process.env.NOTIFICATION_SERVICE_HOST || 'localhost';
    const port = process.env.NOTIFICATION_SERVICE_PORT || '50056';
    const address = process.env.NOTIFICATION_SERVICE_URL
      || (host.includes(':') ? host : `${host}:${port}`);

    this.client = new proto.notification.NotificationService(
    address,
    grpc.credentials.createInsecure(),
    );

    this.logger.log(`NotificationClient conectado a ${address}`);
  }

  async sendNewContentAlert(data: {
    content_title: string;
    content_type: string;
    content_id: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.SendNewContentAlert(data, (err: any, response: any) => {
        if (err) {
          this.logger.error(`Error enviando alerta de nuevo contenido: ${err.message}`);
          reject(err);
          return;
        }
        this.logger.log(`Alerta enviada a ${response.emails_sent} suscriptores`);
        resolve();
      });
    });
  }
}
