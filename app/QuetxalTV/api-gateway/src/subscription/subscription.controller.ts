import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Request as RequestDecorator, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CancelSubscriptionDto, SubscribeDto } from './dto/subscribe.dto';
import { SubscriptionService } from './subscription.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Get('plans/with-rates')
  @UseGuards(JwtGuard)
  getPlansWithRates(@Query('currency') currency: string | undefined, @RequestDecorator() req: AuthenticatedRequest) {
    return this.subscriptionService.getPlansWithRates(currency, req.user.id);
  }

  @Get('plans/:id')
  getPlanById(@Param('id') id: string) {
    return this.subscriptionService.getPlanById(id);
  }

  @Post('subscribe')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.CREATED)
  subscribe(@Body() dto: SubscribeDto, @RequestDecorator() req: AuthenticatedRequest) {
    return this.subscriptionService.subscribe(req.user.id, dto);
  }

  @Delete()
  @UseGuards(JwtGuard)
  cancelSubscription(@Body() dto: CancelSubscriptionDto, @RequestDecorator() req: AuthenticatedRequest) {
    return this.subscriptionService.cancelSubscription(req.user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  getMySubscription(@RequestDecorator() req: AuthenticatedRequest) {
    return this.subscriptionService.getUserSubscription(req.user.id);
  }

  @Get('payments')
  @UseGuards(JwtGuard)
  getPaymentHistory(@RequestDecorator() req: AuthenticatedRequest, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.subscriptionService.getPaymentHistory(req.user.id, Number(limit) || 10, Number(offset) || 0);
  }
}
