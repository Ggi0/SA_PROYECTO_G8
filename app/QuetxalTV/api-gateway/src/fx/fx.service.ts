import { Injectable, OnModuleInit } from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';

// ─── Cliente gRPC para FX Service ───────────────────────
@Injectable()
export class FxService implements OnModuleInit {
  private fxClient: any;

  onModuleInit() {
    // Cargar el proto
    const packageDef = protoLoader.loadSync(
      join(__dirname, '../../../proto/fx.proto'),
      {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      }
    );

    const proto = grpc.loadPackageDefinition(packageDef) as any;

    // Conectar al FX Service
    this.fxClient = new proto.fx.FxService(
      process.env.FX_SERVICE_URL || 'localhost:50054',
      grpc.credentials.createInsecure()
    );
  }

  // ─── Obtener tipo de cambio ────────────────────────────
  getExchangeRate(currency: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.fxClient.GetExchangeRate(
        { target_currency: currency, requested_by: 'api-gateway' },
        (error: any, response: any) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  }

  // ─── Obtener todos los rates ───────────────────────────
  getAllRates(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.fxClient.GetAllRates(
        { requested_by: 'api-gateway' },
        (error: any, response: any) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  }

  // ─── Convertir monto ───────────────────────────────────
  convertAmount(amount: number, currency: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.fxClient.ConvertAmount(
        {
          amount,
          target_currency: currency,
          requested_by: 'api-gateway'
        },
        (error: any, response: any) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  }
}