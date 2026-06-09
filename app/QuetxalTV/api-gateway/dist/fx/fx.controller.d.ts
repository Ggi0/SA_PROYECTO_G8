import { FxService } from './fx.service';
export declare class FxController {
    private readonly fxService;
    constructor(fxService: FxService);
    getAllRates(): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    getExchangeRate(currency: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    convertAmount(amount: string, currency: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
}
