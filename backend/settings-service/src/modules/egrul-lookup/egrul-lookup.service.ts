import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Lookup юридических данных по ИНН/ОГРН через публичный поиск egrul.nalog.ru.
 *
 * Реальный JSON-эндпоинт ФНС:
 *   1. POST / (form-urlencoded) → { t: <token> }
 *   2. GET  /search-result/<token>             → { rows: [...] }
 *
 * Поля в rows[]:
 *   n  — полное наименование организации
 *   c  — краткое наименование (ООО "Ромашка")
 *   o  — ОГРН
 *   i  — ИНН
 *   p  — КПП
 *   r  — дата регистрации (DD.MM.YYYY)
 *   a  — юридический адрес (одной строкой)
 *   g  — должность + ФИО руководителя ("ГЕНЕРАЛЬНЫЙ ДИРЕКТОР: Иванов И.И.")
 *   e  — дата исключения / ликвидации (если есть)
 *   k  — тип записи (`ul` — юр. лицо, `ip` — ИП)
 */

interface EgrulRow {
  n?: string;
  c?: string;
  o?: string;
  i?: string;
  p?: string;
  r?: string;
  a?: string;
  g?: string;
  e?: string;
  k?: string;
}

export interface EgrulLookupResult {
  name: string;
  shortName?: string;
  legalForm?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  registrationDate?: string;
  directorName?: string;
  directorPosition?: string;
  isLiquidated?: boolean;
  liquidationDate?: string;
  raw: EgrulRow;
}

const CACHE_TTL_SECONDS = 60 * 60; // 1 час
const EGRUL_BASE = 'https://egrul.nalog.ru';
const FETCH_TIMEOUT_MS = 8000;

@Injectable()
export class EgrulLookupService implements OnModuleDestroy {
  private readonly logger = new Logger(EgrulLookupService.name);
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: this.config.get<string>('redis.host') || 'localhost',
      port: this.config.get<number>('redis.port') || 6379,
    });
    this.redis.on('error', (err) =>
      this.logger.error('Redis (egrul cache) error', err),
    );
  }

  async lookup(query: string): Promise<EgrulLookupResult> {
    const cleanQuery = (query || '').replace(/\D/g, '');
    if (cleanQuery.length < 10) {
      throw new BadRequestException('ИНН/ОГРН должен содержать минимум 10 цифр');
    }

    const cacheKey = `egrul:${cleanQuery}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as EgrulLookupResult;
      } catch {
        // ignore corrupt cache
      }
    }

    const result = await this.fetchFromEgrul(cleanQuery);
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    return result;
  }

  private async fetchFromEgrul(query: string): Promise<EgrulLookupResult> {
    const token = await this.requestSearch(query);
    const rows = await this.fetchResults(token);

    if (!rows.length) {
      throw new NotFoundException('Организация с таким ИНН/ОГРН не найдена');
    }

    return this.normalize(rows[0]);
  }

  private async requestSearch(query: string): Promise<string> {
    const body = new URLSearchParams({
      vyp3CaptchaToken: '',
      page: '',
      query,
      region: '',
      PreventChromeAutocomplete: '',
    });

    const res = await this.fetchWithTimeout(`${EGRUL_BASE}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'User-Agent':
          'Mozilla/5.0 (CRM-System; +contact via account email) Chrome/120.0 Safari/537.36',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new BadGatewayException(`ФНС вернула HTTP ${res.status}`);
    }

    const data: any = await res.json().catch(() => ({}));

    if (data?.ERRORS?.query) {
      throw new BadRequestException(String(data.ERRORS.query));
    }
    if (data?.captchaRequired) {
      throw new BadGatewayException('ФНС требует CAPTCHA — повторите позже');
    }
    if (typeof data?.t !== 'string' || !data.t) {
      throw new BadGatewayException('Не удалось получить токен поиска ФНС');
    }
    return data.t;
  }

  private async fetchResults(token: string): Promise<EgrulRow[]> {
    // ФНС иногда отдаёт результат не сразу — небольшой retry
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await this.fetchWithTimeout(
        `${EGRUL_BASE}/search-result/${token}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'User-Agent':
              'Mozilla/5.0 (CRM-System) Chrome/120.0 Safari/537.36',
          },
        },
      );
      if (!res.ok) {
        throw new BadGatewayException(
          `ФНС вернула HTTP ${res.status} на /search-result`,
        );
      }
      const data: any = await res.json().catch(() => ({}));

      if (Array.isArray(data?.rows)) {
        return data.rows as EgrulRow[];
      }
      // pending — подождать и повторить
      await new Promise((r) => setTimeout(r, 400));
    }
    throw new BadGatewayException('ФНС не вернула результат поиска');
  }

  private async fetchWithTimeout(url: string, init: any): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new BadGatewayException('Таймаут запроса к ФНС');
      }
      throw new BadGatewayException(`Сбой запроса к ФНС: ${err?.message || err}`);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Парсинг сырых полей ФНС в наш формат. */
  private normalize(row: EgrulRow): EgrulLookupResult {
    const fullName = (row.n || '').trim();
    const legalForm = this.extractLegalForm(fullName);
    const { directorName, directorPosition } = this.parseDirector(row.g);

    return {
      name: this.stripLegalForm(fullName, legalForm),
      shortName: fullName,
      legalForm,
      inn: row.i,
      kpp: row.p,
      ogrn: row.o,
      legalAddress: row.a,
      registrationDate: row.r,
      directorName,
      directorPosition,
      isLiquidated: Boolean(row.e),
      liquidationDate: row.e,
      raw: row,
    };
  }

  private extractLegalForm(name: string): string | undefined {
    const upper = name.toUpperCase();
    if (upper.startsWith('ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ')) return 'ООО';
    if (upper.startsWith('ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО')) return 'ПАО';
    if (upper.startsWith('АКЦИОНЕРНОЕ ОБЩЕСТВО')) return 'АО';
    if (upper.startsWith('ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ')) return 'ИП';
    if (upper.startsWith('ООО ')) return 'ООО';
    if (upper.startsWith('АО ')) return 'АО';
    if (upper.startsWith('ПАО ')) return 'ПАО';
    if (upper.startsWith('ИП ')) return 'ИП';
    return undefined;
  }

  private stripLegalForm(name: string, legalForm?: string): string {
    if (!legalForm) return name;
    // Убираем длинную и краткую форму, кавычки оставляем
    return name
      .replace(/^ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ\s*/i, '')
      .replace(/^ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО\s*/i, '')
      .replace(/^АКЦИОНЕРНОЕ ОБЩЕСТВО\s*/i, '')
      .replace(/^ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ\s*/i, '')
      .replace(/^(ООО|АО|ПАО|ИП)\s+/i, '')
      .replace(/^["«]|["»]$/g, '')
      .trim();
  }

  /**
   * `row.g` обычно приходит в виде «ГД ИВАНОВ ИВАН ИВАНОВИЧ» или
   * «ГЕНЕРАЛЬНЫЙ ДИРЕКТОР ИВАНОВ И.И.». Пытаемся распарсить должность + ФИО.
   */
  private parseDirector(raw?: string): {
    directorName?: string;
    directorPosition?: string;
  } {
    if (!raw) return {};
    const text = raw.trim();
    if (!text) return {};

    // Известные шаблоны должностей
    const POSITION_PATTERNS: Array<{ re: RegExp; label: string }> = [
      { re: /^Г\s*Д\b\.?[\s:]+/i, label: 'Генеральный директор' },
      { re: /^ГЕНЕРАЛЬНЫЙ\s+ДИРЕКТОР[\s:]+/i, label: 'Генеральный директор' },
      { re: /^ДИРЕКТОР[\s:]+/i, label: 'Директор' },
      { re: /^ПРЕЗИДЕНТ[\s:]+/i, label: 'Президент' },
      { re: /^РУКОВОДИТЕЛЬ[\s:]+/i, label: 'Руководитель' },
      { re: /^КОНКУРСНЫЙ УПРАВЛЯЮЩИЙ[\s:]+/i, label: 'Конкурсный управляющий' },
      { re: /^ЛИКВИДАТОР[\s:]+/i, label: 'Ликвидатор' },
      { re: /^УПРАВЛЯЮЩИЙ[\s:]+/i, label: 'Управляющий' },
    ];

    for (const { re, label } of POSITION_PATTERNS) {
      if (re.test(text)) {
        return {
          directorPosition: label,
          directorName: this.toTitleCase(text.replace(re, '').trim()),
        };
      }
    }

    return { directorName: this.toTitleCase(text) };
  }

  private toTitleCase(s: string): string {
    return s
      .toLowerCase()
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ');
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
