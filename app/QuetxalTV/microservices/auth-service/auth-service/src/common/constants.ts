// src/common/constants.ts

// ─────────────────────────────────────────────
//  Nombres de servicios gRPC
//  Se usan como injection token en los módulos
// ─────────────────────────────────────────────
export const AUTH_SERVICE_NAME = 'AUTH_SERVICE';

// Futuros clientes gRPC — cuando se implementen sus microservicios
export const NOTIFICATION_SERVICE_NAME = 'NOTIFICATION_SERVICE';
export const SUBSCRIPTION_SERVICE_NAME  = 'SUBSCRIPTION_SERVICE';

// ─────────────────────────────────────────────
//  Roles de usuario
// ─────────────────────────────────────────────
export const ROLES = {
  CLIENT: 'client',
  ADMIN: 'admin',
} as const;

// ─────────────────────────────────────────────
//  Eventos de auditoría
//  La DB los genera automáticamente por triggers,
//  pero los nombramos aquí para referencia.
// ─────────────────────────────────────────────
export const AUDIT_EVENTS = {
  USER_REGISTERED:    'USER_REGISTERED',
  PASSWORD_CHANGE:    'PASSWORD_CHANGE',
  ACCOUNT_DEACTIVATED:'ACCOUNT_DEACTIVATED',
  ALL_TOKENS_REVOKED: 'ALL_TOKENS_REVOKED',
  LOGIN_FAILED:       'LOGIN_FAILED',
} as const;

// ─────────────────────────────────────────────
//  Límites de negocio
// ─────────────────────────────────────────────
export const MAX_PROFILES_PER_USER = 5;