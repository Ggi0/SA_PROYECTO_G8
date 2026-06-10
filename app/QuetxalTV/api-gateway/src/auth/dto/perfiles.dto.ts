// src/auth/dto/perfiles.dto.ts

// ─────────────────────────────────────────────
//  CREATE PROFILE
// ─────────────────────────────────────────────

export class CreateProfileDto {
    display_name!: string;
    is_kids_mode?: boolean;
    avatar_url?: string;
  }
  
  // ─────────────────────────────────────────────
  //  UPDATE PROFILE
  // ─────────────────────────────────────────────
  
  export class UpdateProfileDto {
    display_name?: string;
    avatar_url?: string;
    is_kids_mode?: boolean;
  }
  
  // ─────────────────────────────────────────────
  //  SELECT PROFILE
  // ─────────────────────────────────────────────
  
  export class SelectProfileDto {
    profile_id!: string;
  }