import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Outgoing SMS via SMSC.ru (https://smsc.ru/api/http/).
 *
 * Reads SMSC_* config from env. If not configured (no login), sending is
 * disabled gracefully: the code is logged with a warning instead of being
 * sent, so local/dev environments don't crash or burn SMS budget.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly login: string;
  private readonly password: string;
  private readonly sender: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.login = this.config.get<string>('sms.smscLogin') || '';
    this.password = this.config.get<string>('sms.smscPassword') || '';
    this.sender = this.config.get<string>('sms.smscSender') || '';
    this.enabled = Boolean(this.login && this.password);
    if (this.enabled) {
      this.logger.log('SMSC.ru configured');
    } else {
      this.logger.warn(
        'SMSC не настроен (SMSC_LOGIN/SMSC_PASSWORD пусты) — коды восстановления будут только логироваться',
      );
    }
  }

  /** Send a recovery OTP code. Returns true if actually dispatched via SMSC. */
  async sendRecoveryCode(phoneDigits: string, code: string): Promise<boolean> {
    const text = `Код восстановления доступа Construction CRM: ${code}. Никому не сообщайте его.`;

    if (!this.enabled) {
      this.logger.warn(`[SMS DISABLED] Код для +${phoneDigits}: ${code}`);
      return false;
    }

    const params = new URLSearchParams({
      login: this.login,
      psw: this.password,
      phones: phoneDigits,
      mes: text,
      fmt: '3', // JSON response
      charset: 'utf-8',
    });
    if (this.sender) params.set('sender', this.sender);

    try {
      const res = await fetch(`https://smsc.ru/sys/send.php?${params.toString()}`);
      const data: any = await res.json();
      if (data?.error) {
        this.logger.error(
          `SMSC ошибка отправки на +${phoneDigits}: ${data.error} (code ${data.error_code})`,
        );
        return false;
      }
      this.logger.log(`SMS-код восстановления отправлен на +${phoneDigits} (id ${data?.id})`);
      return true;
    } catch (err) {
      this.logger.error(
        `Не удалось отправить SMS на +${phoneDigits}: ${(err as Error).message}`,
      );
      return false;
    }
  }
}
