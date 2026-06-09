// Este payload se firma dentro del JWT.
// Luego el API Gateway lo usará para validar identidad y autorización.
export interface JwtPayload {
    sub: string; // ID del usuario
    email: string;
    role: 'client' | 'admin';
  }