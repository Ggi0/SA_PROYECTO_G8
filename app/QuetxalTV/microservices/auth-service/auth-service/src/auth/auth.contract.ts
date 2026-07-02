// src/auth/auth.contract.ts
//
// Los DTOs son interfaces simples porque el transporte es gRPC.
// Si en algún punto expones HTTP también, aquí agregas los decoradores
// de class-validator sobre estas mismas interfaces o clases derivadas.

// ─────────────────────────────────────────────
//  REGISTRO
// ─────────────────────────────────────────────

export interface RegisterRequest {
    email: string;
    password: string;
    displayName: string;   // nombre del perfil inicial
  }
  
  export interface RegisterResponse {
    userId: string;
    profileId: string;
    message: string;
    // Una vez que el Notification Service esté listo,
    // aquí también se confirmaría el envío del email de bienvenida.
  }
  
  // ─────────────────────────────────────────────
  //  LOGIN
  // ─────────────────────────────────────────────
  
  export interface LoginRequest {
    email: string;
    password: string;
    deviceInfo?: string;
    ipAddress?: string;
  }
  
  export interface ProfileSummary {
    profileId: string;
    displayName: string;
    avatarUrl: string | null;
    isKidsMode: boolean;
  }
  
  export interface LoginResponse {
    accessToken: string;
    expiresIn: number;          // segundos
    refreshToken: string;       // se enviará en cookie HttpOnly en el gateway
    user: {
      userId: string;
      email: string;
      role: string;
    };
    profiles: ProfileSummary[];
    activeProfileId: string | null;
  }
  
  // ─────────────────────────────────────────────
  //  REFRESH TOKEN
  // ─────────────────────────────────────────────
  
  export interface RefreshTokenRequest {
    refreshToken: string;
  }
  
  export interface RefreshTokenResponse {
    accessToken: string;
    expiresIn: number;
    activeProfileId: string | null;
  }
  
  // ─────────────────────────────────────────────
  //  LOGOUT
  // ─────────────────────────────────────────────
  
  export interface LogoutRequest {
    refreshToken: string;
  }
  
  export interface LogoutResponse {
    message: string;
  }
  
  export interface LogoutAllRequest {
    userId: string;
  }
  
  export interface LogoutAllResponse {
    message: string;
  }
  
  // ─────────────────────────────────────────────
  //  RECUPERACIÓN DE CONTRASEÑA
  // ─────────────────────────────────────────────
  
  export interface ForgotPasswordRequest {
    email: string;
  }
  
  export interface ForgotPasswordResponse {
    // Siempre devuelve el mismo mensaje para no revelar si el correo existe
    message: string;
  }
  
  export interface ResetPasswordRequest {
    token: string;        // token en texto plano recibido por correo
    newPassword: string;
  }
  
  export interface ResetPasswordResponse {
    message: string;
  }
  
  // ─────────────────────────────────────────────
  //  VALIDAR TOKEN  (usado por otros microservicios vía gRPC)
  // ─────────────────────────────────────────────
  
  export interface ValidateTokenRequest {
    accessToken: string;
  }
  
  export interface ValidateTokenResponse {
    valid: boolean;
    userId: string;
    email: string;
    role: string;
    activeProfileId: string | null;
  }