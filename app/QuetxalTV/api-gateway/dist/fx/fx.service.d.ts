import { OnModuleInit } from '@nestjs/common';
export declare class FxService implements OnModuleInit {
    private fxClient;
    onModuleInit(): void;
    getExchangeRate(currency: string): Promise<any>;
    getAllRates(): Promise<any>;
    convertAmount(amount: number, currency: string): Promise<any>;
}
