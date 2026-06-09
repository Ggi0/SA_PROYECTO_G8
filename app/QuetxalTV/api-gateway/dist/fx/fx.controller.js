"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FxController = void 0;
const common_1 = require("@nestjs/common");
const fx_service_1 = require("./fx.service");
let FxController = class FxController {
    constructor(fxService) {
        this.fxService = fxService;
    }
    async getAllRates() {
        try {
            const response = await this.fxService.getAllRates();
            return {
                success: true,
                data: response.rates,
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'No se pudieron obtener los tipos de cambio',
            };
        }
    }
    async getExchangeRate(currency) {
        try {
            const response = await this.fxService.getExchangeRate(currency);
            return {
                success: true,
                data: response,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `No se pudo obtener el tipo de cambio para ${currency}`,
            };
        }
    }
    async convertAmount(amount, currency) {
        try {
            const response = await this.fxService.convertAmount(parseFloat(amount), currency);
            return {
                success: true,
                data: response,
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'No se pudo realizar la conversión',
            };
        }
    }
};
exports.FxController = FxController;
__decorate([
    (0, common_1.Get)('rates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FxController.prototype, "getAllRates", null);
__decorate([
    (0, common_1.Get)('rates/:currency'),
    __param(0, (0, common_1.Param)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FxController.prototype, "getExchangeRate", null);
__decorate([
    (0, common_1.Get)('convert'),
    __param(0, (0, common_1.Query)('amount')),
    __param(1, (0, common_1.Query)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FxController.prototype, "convertAmount", null);
exports.FxController = FxController = __decorate([
    (0, common_1.Controller)('fx'),
    __metadata("design:paramtypes", [fx_service_1.FxService])
], FxController);
//# sourceMappingURL=fx.controller.js.map