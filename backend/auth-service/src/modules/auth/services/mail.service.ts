import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Outgoing email via SMTP (nodemailer).
 *
 * Reads SMTP_* config from env. If SMTP is not configured (no host), email
 * sending is disabled gracefully: the reset link is logged with a warning
 * instead of being sent, so local/dev environments don't crash.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('mail.host');
    const fromAddress = this.config.get<string>('mail.fromAddress');
    const fromName = this.config.get<string>('mail.fromName');
    this.from = `"${fromName}" <${fromAddress}>`;

    if (host) {
      const user = this.config.get<string>('mail.user');
      const password = this.config.get<string>('mail.password');
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('mail.port'),
        secure: this.config.get<boolean>('mail.secure'),
        auth: user ? { user, pass: password } : undefined,
      });
      this.logger.log(`SMTP configured: ${host}`);
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP не настроен (SMTP_HOST пуст) — письма восстановления будут только логироваться',
      );
    }
  }

  /** Whether SMTP is configured (vs. the graceful "log the link" fallback). */
  get isEnabled(): boolean {
    return this.transporter !== null;
  }

  /** Send a password-reset email. Returns true if actually dispatched via SMTP. */
  async sendPasswordReset(
    to: string,
    resetUrl: string,
    accountsCount: number,
    expiresMinutes: number,
  ): Promise<boolean> {
    const subject = 'Восстановление доступа — Construction CRM';
    const accountsLine =
      accountsCount > 1
        ? `На этот email зарегистрировано несколько аккаунтов (${accountsCount}). По ссылке вы сможете выбрать, какие из них восстановить.`
        : 'По ссылке вы сможете задать новый пароль.';

    const text = [
      'Вы запросили восстановление доступа к Construction CRM.',
      '',
      accountsLine,
      '',
      `Ссылка для восстановления (действительна ${expiresMinutes} мин.):`,
      resetUrl,
      '',
      'Если вы не запрашивали восстановление — просто проигнорируйте это письмо, ваш пароль останется прежним.',
    ].join('\n');

    const html = `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #7c3aed; margin-bottom: 8px;">Восстановление доступа</h2>
        <p>Вы запросили восстановление доступа к <strong>Construction CRM</strong>.</p>
        <p>${accountsLine}</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: 600;">
            Восстановить доступ
          </a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">Ссылка действительна ${expiresMinutes} минут. Если кнопка не работает, скопируйте адрес:</p>
        <p style="color: #6b7280; font-size: 13px; word-break: break-all;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">
          Если вы не запрашивали восстановление — проигнорируйте это письмо, ваш пароль останется прежним.
        </p>
      </div>`;

    if (!this.transporter) {
      this.logger.warn(
        `[MAIL DISABLED] Письмо восстановления для ${to}. Ссылка: ${resetUrl}`,
      );
      return false;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, html });
      this.logger.log(`Письмо восстановления отправлено: ${to}`);
      return true;
    } catch (err) {
      // Do not leak the failure to the caller (no email enumeration); log it.
      this.logger.error(
        `Не удалось отправить письмо восстановления для ${to}: ${(err as Error).message}`,
      );
      return false;
    }
  }
}
