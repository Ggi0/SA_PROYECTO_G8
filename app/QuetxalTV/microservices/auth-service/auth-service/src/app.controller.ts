import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // ─────────────────────────────────────────
  // Liveness
  // ─────────────────────────────────────────
  @GrpcMethod('AuthService', 'HealthLive')
  healthLive() {
    return this.appService.healthLive();
  }

  // ─────────────────────────────────────────
  // Readiness
  // ─────────────────────────────────────────
  @GrpcMethod('AuthService', 'HealthReady')
  healthReady() {
    return this.appService.healthReady();
  }
}