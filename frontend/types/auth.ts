export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  accountId: number;
  roleId?: number;
  position?: string;
  isActive: boolean;
  createdAt: string;
  // Populated after /auth/me or from role lookup
  role?: UserRole;
}

export interface UserRole {
  id: number;
  code: string;
  name: string;
}

export interface JwtPayload {
  sub: number;
  email: string;
  roleId: number | null;
  accountId: number;
  iat: number;
  exp: number;
}
