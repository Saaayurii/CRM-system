export interface JwtPayload {
  sub: number;
  email: string;
  roleId: number | null;
  accountId: number;
  sid?: number; // session ID — used to check the revocation blacklist
  iat?: number;
  exp?: number;
}
