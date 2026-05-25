import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

const CLIENT_ROLE_ID = 15;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Точечно разрешённые write-операции для клиента
// (нужны для авторизации, чатов и собственного профиля)
const CLIENT_ALLOWED_WRITES: Array<{ method: string; pattern: RegExp }> = [
  { method: 'POST', pattern: /\/auth\/(refresh|logout|logout-all)$/ },
  { method: 'POST', pattern: /\/chat-channels\/[^/]+\/messages$/ },
  { method: 'POST', pattern: /\/chat-channels\/[^/]+\/upload$/ },
  { method: 'PUT', pattern: /\/chat-channels\/messages\/[^/]+$/ },
  { method: 'PATCH', pattern: /\/notifications\/[^/]+\/read$/ },
  { method: 'PUT', pattern: /\/user-preferences$/ },
  { method: 'POST', pattern: /\/notifications\/push-subscribe$/ },
  { method: 'DELETE', pattern: /\/notifications\/push-subscribe$/ },
  { method: 'DELETE', pattern: /\/auth\/sessions\/[^/]+$/ },
];

@Injectable()
export class ClientReadOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user || user.roleId !== CLIENT_ROLE_ID) return true;

    const method: string = req.method?.toUpperCase() ?? 'GET';
    if (SAFE_METHODS.has(method)) return true;

    const path: string = req.originalUrl || req.url || '';
    const allowed = CLIENT_ALLOWED_WRITES.some(
      (rule) => rule.method === method && rule.pattern.test(path),
    );
    if (allowed) return true;

    throw new ForbiddenException(
      'Клиентский портал работает в режиме «только просмотр»',
    );
  }
}
