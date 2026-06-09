"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FxService = void 0;
const common_1 = require("@nestjs/common");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path_1 = require("path");
let FxService = class FxService {
    onModuleInit() {
        const packageDef = protoLoader.loadSync((0, path_1.join)(__dirname, '../../proto/fx.proto'), {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
        });
        const proto = grpc.loadPackageDefinition(packageDef);
        this.fxClient = new proto.fx.FxService(process.env.FX_SERVICE_URL || 'localhost:50054', grpc.credentials.createInsecure());
    }
    getExchangeRate(currency) {
        return new Promise((resolve, reject) => {
            this.fxClient.GetExchangeRate({ target_currency: currency, requested_by: 'api-gateway' }, (error, response) => {
                if (error)
                    reject(error);
                else
                    resolve(response);
            });
        });
    }
    getAllRates() {
        return new Promise((resolve, reject) => {
            this.fxClient.GetAllRates({ requested_by: 'api-gateway' }, (error, response) => {
                if (error)
                    reject(error);
                else
                    resolve(response);
            });
        });
    }
    convertAmount(amount, currency) {
        return new Promise((resolve, reject) => {
            this.fxClient.ConvertAmount({
                amount,
                target_currency: currency,
                requested_by: 'api-gateway'
            }, (error, response) => {
                if (error)
                    reject(error);
                else
                    resolve(response);
            });
        });
    }
};
exports.FxService = FxService;
exports.FxService = FxService = __decorate([
    (0, common_1.Injectable)()
], FxService);
//# sourceMappingURL=fx.service.js.map