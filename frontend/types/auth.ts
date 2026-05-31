export interface LoginRequest {
  email: string;
  password: string;
  accountId?: number;
}

export interface TwoFactorChallenge {
  mode: 'verify' | 'setup';
  token: string;
  otpauthUrl?: string;
  qrDataUrl?: string;
  secret?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  sessionId?: number;
  accounts?: Array<{ id: number; name: string; logoUrl?: string }>;
  twoFactor?: TwoFactorChallenge;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  accountId: number;
  accountName?: string;
  accountLogoUrl?: string;
  isGlobalAdmin?: boolean;
  roleId?: number;
  position?: string;
  isActive: boolean;
  createdAt: string;
  mustChangePassword?: boolean;
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
  accountName?: string;
  accountLogoUrl?: string;
  isGlobalAdmin?: boolean;
  iat: number;
  exp: number;
}
