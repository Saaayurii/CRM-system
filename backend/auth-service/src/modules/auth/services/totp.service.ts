import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

/**
 * TOTP (RFC 6238) helper for two-factor authentication via authenticator apps
 * (Google Authenticator, 1Password, Authy, ...). Secrets are base32 strings
 * stored per-user in `User.settings.twoFactor.secret`.
 */
@Injectable()
export class TotpService {
  private readonly issuer: string;

  constructor(private readonly config: ConfigService) {
    this.issuer = this.config.get<string>('totp.issuer') || 'Construction CRM';
    // Allow ±1 time-step (±30s) to tolerate client/server clock skew.
    authenticator.options = { window: 1 };
  }

  /** Generate a new base32 secret for enrollment. */
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  /** Build the otpauth:// URI used to render the enrollment QR code. */
  keyuri(accountName: string, secret: string): string {
    return authenticator.keyuri(accountName, this.issuer, secret);
  }

  /** Verify a 6-digit code against a secret (tolerant of spaces). */
  verify(token: string, secret: string): boolean {
    if (!token || !secret) return false;
    try {
      return authenticator.verify({ token: token.replace(/\s+/g, ''), secret });
    } catch {
      return false;
    }
  }

  /** Render the otpauth URI as a data:image/png;base64 QR code. */
  async qrDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }
}
