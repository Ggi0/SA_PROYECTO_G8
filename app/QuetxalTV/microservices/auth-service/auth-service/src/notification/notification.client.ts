import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

@Injectable()
export class NotificationClient implements OnModuleInit {
  private readonly logger = new Logger(NotificationClient.name);
  private client: any;

  onModuleInit() {
    const PROTO_PATH = path.resolve(process.cwd(), 'src/proto/notification.proto');

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

    this.client = new proto.notification.NotificationService(
      `${host}:${port}`,
      grpc.credentials.createInsecure(),
    );

    this.logger.log(`NotificationClient conectado a ${host}:${port}`);
  }

  async sendWelcomeEmail(data: {
    user_id: string;
    user_email: string;
    user_name: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.SendWelcomeEmail(data, (err: any, response: any) => {
        if (err) {
          this.logger.error(`Error enviando welcome email: ${err.message}`);
          reject(err);
          return;
        }
        this.logger.log(`Welcome email encolado: ${response.message}`);
        resolve();
      });
    });
  }
}