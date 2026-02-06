export interface JwtPayload {
  sub: number;
  email: string;
  roleId: number | null;
  accountId: number;
  iat?: number;
  exp?: number;
}
