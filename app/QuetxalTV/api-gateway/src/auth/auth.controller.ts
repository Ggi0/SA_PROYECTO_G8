// src/auth/auth.controller.ts  (API Gateway)

import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    Req,
    Res,
    UseGuards,
    HttpCode,
    HttpStatus,
    BadRequestException,
  } from '@nestjs/common';
  import { Request, Response } from 'express';
  import { AuthGatewayService } from './auth.service';
  import { AuthJwtGuard, AuthRequest } from '../common/guards/auth-jwt.guard';
  import {
    RegisterDto,
    LoginDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    ChangePasswordDto,
  } from './dto/auth.dto';
  import {
    CreateProfileDto,
    UpdateProfileDto,
    SelectProfileDto,
  } from './dto/perfiles.dto';
  
  // ─────────────────────────────────────────────
  //  Nombre de la cookie del refresh token
  // ─────────────────────────────────────────────
  const REFRESH_COOKIE = 'refresh_token';
  
  // ─────────────────────────────────────────────
  //  Opciones de la cookie — HttpOnly + Secure en prod
  // ─────────────────────────────────────────────
  function refreshCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure:   isProd,
      sameSite: isProd ? ('strict' as const) : ('lax' as const),
      maxAge:   30 * 24 * 60 * 60 * 1000, // 30 días en ms
      path:     '/',
    };
  }
  
  @Controller('auth')
  export class AuthController {
    constructor(private readonly authService: AuthGatewayService) {}
  
    // ═══════════════════════════════════════════
    //  PÚBLICOS
    // ═══════════════════════════════════════════
  
    // POST /auth/register
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    register(@Body() body: RegisterDto) {
      return this.authService.register({
        email:        body.email,
        password:     body.password,
        displayName: body.displayName,
      });
    }
  
    // POST /auth/login
    // Devuelve el access_token en el body y el refresh_token en cookie HttpOnly
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
      @Body() body: LoginDto,
      @Req()  req:  Request,
      @Res({ passthrough: true }) res: Response,
    ) {
      if (!body?.email || !body?.password) {
        throw new BadRequestException('Email y password son requeridos.');
      }

      const result = await this.authService.login({
        email:      body.email,
        password:   body.password,
        deviceInfo: req.headers['user-agent'] ?? '',
        ipAddress:  (req.headers['x-forwarded-for'] as string) || req.ip || '',
      }) as Record<string, unknown>;
  
      // El refresh_token va en cookie HttpOnly — nunca en el body al frontend
      const refreshToken = result['refresh_token'] as string | undefined;
      if (refreshToken) {
        res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
      }
  
      // Quitar refresh_token del body antes de responder
      const { refresh_token: _, ...safeResult } = result;
      return safeResult;
    }
  
    // POST /auth/refresh
    // Lee el refresh_token de la cookie, rota y devuelve nuevo access_token
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
      @Req()  req: Request,
      @Res({ passthrough: true }) res: Response,
    ) {
      const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      if (!rawToken) {
        res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'No refresh token provided',
        });
        return;
      }
  
      const result = await this.authService.refreshToken(rawToken) as Record<string, unknown>;
  
      // Si el microservicio devuelve un nuevo refresh_token (rotación), actualizar cookie
      const newRefresh = result['refresh_token'] as string | undefined;
      if (newRefresh) {
        res.cookie(REFRESH_COOKIE, newRefresh, refreshCookieOptions());
        const { refresh_token: _, ...safeResult } = result;
        return safeResult;
      }
  
      return result;
    }
  
    // POST /auth/logout
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
      @Req()  req: Request,
      @Res({ passthrough: true }) res: Response,
    ) {
      const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  
      if (rawToken) {
        await this.authService.logout(rawToken);
      }
  
      // Siempre limpiar la cookie aunque el token ya no exista
      res.clearCookie(REFRESH_COOKIE, { path: '/' });
      return { message: 'Sesión cerrada.' };
    }
  
    // POST /auth/password/forgot
    @Post('password/forgot')
    @HttpCode(HttpStatus.OK)
    forgotPassword(@Body() body: ForgotPasswordDto) {
      return this.authService.forgotPassword(body.email);
    }
  
    // POST /auth/password/reset
    @Post('password/reset')
    @HttpCode(HttpStatus.OK)
    resetPassword(@Body() body: ResetPasswordDto) {
      return this.authService.resetPassword(body.reset_token, body.new_password);
    }
  
    // ═══════════════════════════════════════════
    //  PROTEGIDOS  (requieren JWT válido)
    // ═══════════════════════════════════════════
  
    // GET /auth/me
    @Get('me')
    @UseGuards(AuthJwtGuard)
    getMe(@Req() req: AuthRequest) {
      return this.authService.getMe(
        req.authUser.userId,
        req.authUser.activeProfileId,
      );
    }
  
    // POST /auth/logout-all
    @Post('logout-all')
    @UseGuards(AuthJwtGuard)
    @HttpCode(HttpStatus.OK)
    async logoutAll(
      @Req()  req: AuthRequest,
      @Res({ passthrough: true }) res: Response,
    ) {
      const result = await this.authService.logoutAll(req.authUser.userId);
      res.clearCookie(REFRESH_COOKIE, { path: '/' });
      return result;
    }
  
    // ─────────────────────────────────────────────
    //  PERFILES
    // ─────────────────────────────────────────────
  
    // GET /auth/profiles
    @Get('profiles')
    @UseGuards(AuthJwtGuard)
    listProfiles(@Req() req: AuthRequest) {
      return this.authService.listProfiles(req.authUser.userId);
    }
  
    // POST /auth/profiles
    @Post('profiles')
    @UseGuards(AuthJwtGuard)
    @HttpCode(HttpStatus.CREATED)
    createProfile(@Req() req: AuthRequest, @Body() body: CreateProfileDto) {
      return this.authService.createProfile({
        userId:      req.authUser.userId,
        displayName: body.display_name,
        isKidsMode:  body.is_kids_mode,
        avatarUrl:   body.avatar_url,
      });
    }
  
    // PATCH /auth/profiles/:id
    @Patch('profiles/:id')
    @UseGuards(AuthJwtGuard)
    updateProfile(
      @Req()        req:  AuthRequest,
      @Param('id')  id:   string,
      @Body()       body: UpdateProfileDto,
    ) {
      return this.authService.updateProfile({
        userId:      req.authUser.userId,
        profileId:   id,
        displayName: body.display_name,
        avatarUrl:   body.avatar_url,
        isKidsMode:  body.is_kids_mode,
      });
    }
  
    // DELETE /auth/profiles/:id
    @Delete('profiles/:id')
    @UseGuards(AuthJwtGuard)
    @HttpCode(HttpStatus.OK)
    deleteProfile(@Req() req: AuthRequest, @Param('id') id: string) {
      return this.authService.deleteProfile(req.authUser.userId, id);
    }
  
    // POST /auth/profiles/select
    // IMPORTANTE: debe ir ANTES de profiles/:id para que NestJS no lo confunda
    @Post('profiles/select')
    @UseGuards(AuthJwtGuard)
    @HttpCode(HttpStatus.OK)
    selectProfile(@Req() req: AuthRequest, @Body() body: SelectProfileDto) {
      return this.authService.selectProfile(
        req.authUser.userId,
        body.profile_id,
      );
    }
  
    // PATCH /auth/password/change
    @Patch('password/change')
    @UseGuards(AuthJwtGuard)
    @HttpCode(HttpStatus.OK)
    changePassword(@Req() req: AuthRequest, @Body() body: ChangePasswordDto) {
      return this.authService.changePassword({
        userId:          req.authUser.userId,
        currentPassword: body.current_password,
        newPassword:     body.new_password,
      });
    }


    // ─────────────────────────────────────────────
//  ADMIN - AUDITORÍA
// ─────────────────────────────────────────────

// GET /auth/admin/audit
@Get('admin/audit')
@UseGuards(AuthJwtGuard)
getAuditLogs(@Req() req: AuthRequest) {
  console.log('USER:', req.authUser);
  return this.authService.getAuditLogs({
    adminUserId: req.authUser.userId, // ✅ automático desde JWT
    page: 1,
    pageSize: 20,
  });
}

// GET /auth/admin/audit/export
@Get('admin/audit/export')
@UseGuards(AuthJwtGuard)
async exportAuditLogs(
  @Req() req: AuthRequest,
  @Res() res: Response,
) {
  const result = await this.authService.exportAuditLogs({
    adminUserId: req.authUser.userId,
    format: 'csv',
  }) as any;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=audit.csv');

  return res.send(result.file);
}



// ─────────────────────────────────────────────
//  HEALTH
// ─────────────────────────────────────────────

// GET /auth/health/live
@Get('health/live')
healthLive() {
  return this.authService.healthLive();
}

// GET /auth/health/ready
@Get('health/ready')
healthReady() {
  return this.authService.healthReady();
}




  }
