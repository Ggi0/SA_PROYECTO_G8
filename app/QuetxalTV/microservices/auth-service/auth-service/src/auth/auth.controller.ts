import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

@Controller()
export class AuthController {

  @GrpcMethod('AuthService', 'Login')
  login(data: any, metadata: any) {
    console.log('Login request:', data);

    return {
      access_token: 'fake-token',
      refresh_token: 'fake-refresh',
    };
  }

}