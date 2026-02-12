import { AxiosError } from 'axios';
import type { DiagnosticError, ErrorCategory } from '@/types/admin';

export function categorizeError(error: AxiosError, service = 'Неизвестный'): DiagnosticError {
  const timestamp = new Date().toISOString();

  // No response at all — network error
  if (!error.response) {
    return {
      category: 'network',
      service,
      message: 'Нет ответа от сервера',
      timestamp,
      suggestion: 'Проверьте подключение к сети и убедитесь, что сервер запущен',
    };
  }

  const status = error.response.status;
  const data = error.response.data as Record<string, unknown> | undefined;
  const serverMessage = (data?.message || data?.error || '') as string;

  // Auth errors
  if (status === 401) {
    return {
      category: 'auth',
      service,
      message: 'Сессия истекла или невалидный токен',
      timestamp,
      suggestion: 'Войдите в систему заново',
    };
  }

  if (status === 403) {
    return {
      category: 'auth',
      service,
      message: 'Доступ запрещён',
      timestamp,
      suggestion: 'У вас нет прав для выполнения этого действия',
    };
  }

  // Service unavailable
  if (status === 502 || status === 503 || status === 504) {
    return {
      category: 'service',
      service,
      message: `Микросервис недоступен (${status})`,
      timestamp,
      suggestion: 'Попробуйте перезапустить микросервис из панели администрирования',
    };
  }

  // Database errors (heuristic: check message for DB keywords)
  if (
    status === 500 &&
    /database|db|postgres|mysql|mongo|connection refused|ECONNREFUSED|typeorm|prisma|sequelize/i.test(serverMessage)
  ) {
    return {
      category: 'database',
      service,
      message: 'Ошибка базы данных',
      timestamp,
      suggestion: 'Проверьте подключение к базе данных и её состояние',
    };
  }

  // Generic server error
  if (status >= 500) {
    return {
      category: 'service',
      service,
      message: serverMessage || `Внутренняя ошибка сервера (${status})`,
      timestamp,
      suggestion: 'Попробуйте повторить операцию или обратитесь к администратору',
    };
  }

  // Client errors (400, 404, 409, 422, etc.)
  if (status >= 400) {
    return {
      category: 'unknown',
      service,
      message: serverMessage || `Ошибка запроса (${status})`,
      timestamp,
      suggestion: 'Проверьте введённые данные и попробуйте снова',
    };
  }

  return {
    category: 'unknown',
    service,
    message: serverMessage || 'Неизвестная ошибка',
    timestamp,
    suggestion: 'Попробуйте повторить операцию',
  };
}

const CATEGORY_LABELS: Record<ErrorCategory, string> = {
  network: 'Сеть',
  auth: 'Авторизация',
  service: 'Сервис',
  database: 'База данных',
  unknown: 'Прочее',
};

export function getCategoryLabel(category: ErrorCategory): string {
  return CATEGORY_LABELS[category] || category;
}
