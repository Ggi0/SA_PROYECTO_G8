import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { DataSource } from 'typeorm';

type HealthCheckRequest = {
  service?: string;
};

@Controller()
export class HealthGrpcController {
  constructor(private readonly dataSource: DataSource) {}

  @GrpcMethod('Health', 'Check')
  check(request: HealthCheckRequest) {
    if (request.service === 'auth-service-readiness' && !this.dataSource.isInitialized) {
      return { status: 2 };
    }

    return { status: 1 };
  }
}
