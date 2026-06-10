// src/auth/dto/auth.dto.ts
//
// DTOs del API Gateway — lo que recibe del frontend vía HTTP.
// No usan class-validator aquí porque el gateway es un proxy liviano;
// la validación real ocurre en el microservicio.
// Si quieres agregar validaciones de entrada, instala class-validator
// y decora estos campos con @IsEmail(), @MinLength(), etc.

// ─────────────────────────────────────────────
//  REGISTER
// ─────────────────────────────────────────────

export class RegisterDto {
    email!: string;
    password!: string;
    display_name?: string;
    displayName?: string;
  }
  // ─────────────────────────────────────────────
  //  LOGIN
  // ─────────────────────────────────────────────
  
  export class LoginDto {
    email!: string;
    password!: string;
  }
  
  // ─────────────────────────────────────────────
  //  FORGOT / RESET PASSWORD
  // ─────────────────────────────────────────────
  
  export class ForgotPasswordDto {
    email!: string;
  }
  
  export class ResetPasswordDto {
    reset_token!: string;
    new_password!: string;
  }
  
  // ─────────────────────────────────────────────
  //  CHANGE PASSWORD  (protegido — requiere JWT)
  // ─────────────────────────────────────────────
  
  export class ChangePasswordDto {
    current_password!: string;
    new_password!: string;
  }