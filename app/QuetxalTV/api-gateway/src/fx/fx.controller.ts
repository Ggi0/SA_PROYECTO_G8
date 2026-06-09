import { Controller, Get, Param, Query } from '@nestjs/common';
import { FxService } from './fx.service';

// ─── Endpoints REST para FX Service ─────────────────────
@Controller('fx')
export class FxController {

  constructor(private readonly fxService: FxService) {}

  // GET /fx/rates — todos los tipos de cambio
  @Get('rates')
  async getAllRates() {
    try {
      const response = await this.fxService.getAllRates();
      return {
        success: true,
        data: response.rates,
      };
    } catch (error) {
      return {
        success: false,
        error: 'No se pudieron obtener los tipos de cambio',
      };
    }
  }

  // GET /fx/rates/:currency — tipo de cambio de una divisa
  @Get('rates/:currency')
  async getExchangeRate(@Param('currency') currency: string) {
    try {
      const response = await this.fxService.getExchangeRate(currency);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: `No se pudo obtener el tipo de cambio para ${currency}`,
      };
    }
  }

  // GET /fx/convert?amount=9.99&currency=GTQ
  @Get('convert')
  async convertAmount(
    @Query('amount') amount: string,
    @Query('currency') currency: string,
  ) {
    try {
      const response = await this.fxService.convertAmount(
        parseFloat(amount),
        currency
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: 'No se pudo realizar la conversión',
      };
    }
  }
}