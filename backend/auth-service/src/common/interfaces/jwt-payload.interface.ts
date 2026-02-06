export interface JwtPayload {
  sub: number; // user_id
  email: string;
  roleId: number | null;
  accountId: number;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: number; // user_id
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}
