import { Injectable, OnModuleInit } from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';

@Injectable()
export class FxService implements OnModuleInit {
  private fxClient: any;

  onModuleInit() {
    const packageDef = protoLoader.loadSync(
     join(__dirname, '../proto/fx.proto'),
      {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      }
    );

    const proto = grpc.loadPackageDefinition(packageDef) as any;

    // ─── Usar FX_SERVICE_HOST del .env ──────────────────
    const fxUrl = process.env.FX_SERVICE_HOST || 'localhost:50054'
    console.log(`[FX Gateway] Conectando a FX Service en ${fxUrl}`)

    this.fxClient = new proto.fx.FxService(
      fxUrl,
      grpc.credentials.createInsecure()
    );
  }
getExchangeRate(currency: string): Promise<any> {
  return new Promise((resolve, reject) => {
    this.fxClient.GetExchangeRate(
      { target_currency: currency, requested_by: 'api-gateway' },
      (error: any, response: any) => {
        if (error) {
          console.error(`[FX Gateway] Error gRPC para ${currency}:`, error)
          reject(error)
        } else {
          console.log(`[FX Gateway] Respuesta para ${currency}:`, response)
          resolve(response)
        }
      }
    )
  })
}

  getAllRates(): Promise<any> {
    // Obtenemos rates para todas las divisas soportadas
    const currencies = ['GTQ', 'MXN', 'EUR', 'COP', 'BRL', 'HNL', 'CRC']
    return Promise.all(
      currencies.map(currency =>
        new Promise((resolve, reject) => {
          this.fxClient.GetExchangeRate(
            { from_currency: 'USD', to_currency: currency },
            (error: any, response: any) => {
              if (error) resolve(null)
              else resolve({ ...response, currency_code: currency })
            }
          )
        })
      )
    ).then(results => results.filter(Boolean))
  }

  convertAmount(amount: number, currency: string): Promise<any> {
    return this.getExchangeRate(currency).then(rate => ({
      original_amount: amount,
      converted_amount: (amount * rate.rate).toFixed(2),
      currency_code: currency,
      rate: rate.rate,
      success: true
    }))
  }
}