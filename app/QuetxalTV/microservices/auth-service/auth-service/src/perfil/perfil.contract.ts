// src/perfil/perfil.contract.ts

// ─────────────────────────────────────────────
//  SHARED — perfil serializado para respuestas
// ─────────────────────────────────────────────

export interface ProfileDto {
    profileId:   string;
    displayName: string;
    avatarUrl:   string | null;
    isKidsMode:  boolean;
  }
  
  // ─────────────────────────────────────────────
  //  LIST
  // ─────────────────────────────────────────────
  
  export interface ListProfilesRequest {
    userId: string;
  }
  
  export interface ListProfilesResponse {
    profiles:   ProfileDto[];
    count:      number;
    maxAllowed: number;   // siempre 5
  }
  
  // ─────────────────────────────────────────────
  //  CREATE
  // ─────────────────────────────────────────────
  
  export interface CreateProfileRequest {
    userId:      string;
    displayName: string;
    isKidsMode?: boolean;
    avatarUrl?:  string;
  }
  
  export interface CreateProfileResponse {
    profile: ProfileDto;
  }
  
  // ─────────────────────────────────────────────
  //  UPDATE
  //  Campos opcionales: vacío = no modificar
  // ─────────────────────────────────────────────
  
  export interface UpdateProfileRequest {
    userId:       string;
    profileId:    string;
    displayName?: string;
    avatarUrl?:   string;
    isKidsMode?:  boolean;
  }
  
  export interface UpdateProfileResponse {
    profile: ProfileDto;
  }
  
  // ─────────────────────────────────────────────
  //  DELETE
  // ─────────────────────────────────────────────
  
  export interface DeleteProfileRequest {
    userId:    string;
    profileId: string;
  }
  
  export interface DeleteProfileResponse {
    message: string;
  }
  
  // ─────────────────────────────────────────────
  //  SELECT  (activa un perfil → nuevo JWT)
  // ─────────────────────────────────────────────
  
  export interface SelectProfileRequest {
    userId:    string;
    profileId: string;
  }
  
  export interface SelectProfileResponse {
    accessToken:   string;
    activeProfile: ProfileDto;
  }

  // ─────────────────────────────────────────────
  //  PARENTAL PIN
  // ─────────────────────────────────────────────

  export interface SetParentalPinRequest {
    userId: string;
    pin:    string; // 4 dígitos, o vacío para eliminar PIN
  }

  export interface SetParentalPinResponse {
    success: boolean;
    message: string;
  }

  export interface VerifyParentalPinRequest {
    userId: string;
    pin:    string;
  }

  export interface VerifyParentalPinResponse {
    valid: boolean;
  }