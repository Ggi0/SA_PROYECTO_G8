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
exports.SubscriptionController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../common/guards/jwt.guard");
const subscribe_dto_1 = require("./dto/subscribe.dto");
const subscription_service_1 = require("./subscription.service");
let SubscriptionController = class SubscriptionController {
    constructor(subscriptionService) {
        this.subscriptionService = subscriptionService;
    }
    getPlans() {
        return this.subscriptionService.getPlans();
    }
    getPlansWithRates(currency, req) {
        return this.subscriptionService.getPlansWithRates(currency, req.user.id);
    }
    getPlanById(id) {
        return this.subscriptionService.getPlanById(id);
    }
    subscribe(dto, req) {
        return this.subscriptionService.subscribe(req.user.id, dto);
    }
    cancelSubscription(dto, req) {
        return this.subscriptionService.cancelSubscription(req.user.id, dto);
    }
    getMySubscription(req) {
        return this.subscriptionService.getUserSubscription(req.user.id);
    }
    getPaymentHistory(req, limit, offset) {
        return this.subscriptionService.getPaymentHistory(req.user.id, Number(limit) || 10, Number(offset) || 0);
    }
};
exports.SubscriptionController = SubscriptionController;
__decorate([
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SubscriptionController.prototype, "getPlans", null);
__decorate([
    (0, common_1.Get)('plans/with-rates'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Query)('currency')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SubscriptionController.prototype, "getPlansWithRates", null);
__decorate([
    (0, common_1.Get)('plans/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SubscriptionController.prototype, "getPlanById", null);
__decorate([
    (0, common_1.Post)('subscribe'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [subscribe_dto_1.SubscribeDto, Object]),
    __metadata("design:returntype", void 0)
], SubscriptionController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Delete)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [subscribe_dto_1.CancelSubscriptionDto, Object]),
    __metadata("design:returntype", void 0)
], SubscriptionController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SubscriptionController.prototype, "getMySubscription", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], SubscriptionController.prototype, "getPaymentHistory", null);
exports.SubscriptionController = SubscriptionController = __decorate([
    (0, common_1.Controller)('subscriptions'),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService])
], SubscriptionController);
//# sourceMappingURL=subscription.controller.js.map