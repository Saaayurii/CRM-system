'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { resolveShare, ResolvedShare } from '@/lib/share';

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token as string;
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<ResolvedShare | null>(null);
  const [message, setMessage] = useState('Открываем ссылку…');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setData(await resolveShare(token));
        setState('ready');
      } catch (e: any) {
        setState('error');
        const status = e?.response?.status;
        setMessage(
          status === 410
            ? 'Срок действия ссылки истёк или она была отозвана.'
            : 'Ссылка недействительна или содержимое недоступно.',
        );
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-slate-900 dark:text-slate-100">3.15 CRM</span>
          <span className="text-xs text-slate-400">Просмотр по ссылке</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {state === 'loading' && (
          <div className="text-center text-slate-500 py-20">{message}</div>
        )}
        {state === 'error' && (
          <div className="max-w-md mx-auto rounded-2xl bg-white dark:bg-slate-900 shadow-xl p-8 border border-slate-200 dark:border-slate-800 text-center">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Ссылка недоступна
            </h1>
            <p className="text-sm text-slate-500">{message}</p>
          </div>
        )}
        {state === 'ready' && data && <ShareContent data={data} />}
      </main>
    </div>
  );
}

function ShareContent({ data }: { data: ResolvedShare }) {
  const entity = data.entity as any;
  const heading =
    data.title ||
    entity?.title ||
    entity?.name ||
    entity?.address ||
    data.label;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-violet-500 font-medium">
          {data.label}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {heading}
        </h1>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <EntityRenderer type={data.entityType} entity={entity} />
      </div>
    </div>
  );
}

function EntityRenderer({ type, entity }: { type: string; entity: any }) {
  if (!entity) return <p className="text-slate-400">Нет данных.</p>;

  switch (type) {
    case 'site-plan':
      return <SitePlanView plan={entity} />;
    case 'document':
      return <DocumentView doc={entity} />;
    case 'deal':
      return (
        <Fields
          rows={[
            ['Сумма', formatMoney(entity.amount, entity.currency)],
            ['Статус', dealStatus(entity.status)],
            ['Стадия', entity.stage?.name],
            ['Клиент', clientName(entity.client)],
            ['Ожид. закрытие', formatDate(entity.expectedCloseDate)],
            ['Описание', entity.description],
          ]}
        />
      );
    case 'project':
      return (
        <Fields
          rows={[
            ['Код', entity.code],
            ['Статус', String(entity.status ?? '')],
            ['Начало', formatDate(entity.startDate)],
            ['Окончание', formatDate(entity.endDate)],
            ['Описание', entity.description],
          ]}
        />
      );
    case 'construction-site':
      return (
        <Fields
          rows={[
            ['Адрес', entity.address],
            ['Статус', String(entity.status ?? '')],
            ['Площадь', entity.area],
          ]}
        />
      );
    default:
      return <GenericView entity={entity} />;
  }
}

function SitePlanView({ plan }: { plan: any }) {
  const defects: any[] = Array.isArray(plan.defects) ? plan.defects : [];
  const pins = defects.filter(
    (d) => d.coordinates && typeof d.coordinates.x === 'number',
  );
  return (
    <div className="space-y-4">
      {plan.imageUrl ? (
        <div className="relative inline-block max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plan.imageUrl} alt={plan.title || 'План'} className="max-w-full rounded-lg" />
          {pins.map((d) => (
            <span
              key={d.id}
              title={d.description || d.title || `Дефект #${d.id}`}
              className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-red-500 border-2 border-white shadow flex items-center justify-center text-[10px] text-white"
              style={{
                left: `${d.coordinates.x * 100}%`,
                top: `${d.coordinates.y * 100}%`,
              }}
            >
              !
            </span>
          ))}
        </div>
      ) : (
        <p className="text-slate-400">Изображение плана недоступно.</p>
      )}
      <p className="text-sm text-slate-500">
        Отмечено дефектов: {pins.length}
      </p>
    </div>
  );
}

function DocumentView({ doc }: { doc: any }) {
  return (
    <div className="space-y-4">
      <Fields
        rows={[
          ['Тип', doc.documentType],
          ['Статус', doc.status],
          ['Описание', doc.description],
        ]}
      />
      {doc.fileUrl && (
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm"
        >
          Открыть файл
        </a>
      )}
    </div>
  );
}

function GenericView({ entity }: { entity: any }) {
  // Показываем простые поля (строки/числа/даты), скрывая служебные и объекты.
  const HIDDEN = new Set([
    'id',
    'accountId',
    'createdByUserId',
    'updatedByUserId',
    'deletedAt',
    'passwordHash',
  ]);
  const rows: Array<[string, any]> = Object.entries(entity)
    .filter(
      ([k, v]) =>
        !HIDDEN.has(k) &&
        (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') &&
        String(v).length > 0,
    )
    .map(([k, v]) => [humanize(k), typeof v === 'boolean' ? (v ? 'Да' : 'Нет') : v]);

  if (rows.length === 0) return <p className="text-slate-400">Нет отображаемых полей.</p>;
  return <Fields rows={rows} />;
}

function Fields({ rows }: { rows: Array<[string, any]> }) {
  const visible = rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (visible.length === 0) return <p className="text-slate-400">Нет данных.</p>;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-4 gap-y-2 text-sm">
      {visible.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-slate-400">{label}</dt>
          <dd className="text-slate-800 dark:text-slate-200">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatDate(d?: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('ru-RU');
}

function formatMoney(amount?: number | string | null, currency?: string): string {
  if (amount === null || amount === undefined || amount === '') return '';
  const n = Number(amount);
  if (isNaN(n)) return '';
  return `${n.toLocaleString('ru-RU')} ${currency || 'RUB'}`;
}

function dealStatus(s?: string): string {
  return s === 'won' ? 'Выиграна' : s === 'lost' ? 'Проиграна' : 'В работе';
}

function clientName(c?: any): string {
  if (!c) return '';
  return c.companyName || [c.lastName, c.firstName].filter(Boolean).join(' ') || c.name || '';
}
