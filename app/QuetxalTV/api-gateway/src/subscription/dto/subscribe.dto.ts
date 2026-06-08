export class SubscribeDto {
  planId!: string;
  currency?: string;
  paymentMethod?: string;
}

export class CancelSubscriptionDto {
  reason?: string;
}
