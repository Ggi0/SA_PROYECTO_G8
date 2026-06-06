import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {

  login(data: any) {
    const { email, password } = data;

    // TODO: validar en DB
    // holaaa

    return {
      access_token: 'jwt-token',
      refresh_token: 'refresh-token',
    };
  }

}