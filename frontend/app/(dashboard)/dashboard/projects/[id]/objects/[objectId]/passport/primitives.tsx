'use client';

/**
 * Shared UI primitives for the Object Technical Passport sections.
 * Every passport section composes these so the look stays consistent with the
 * dark CRM design from the mockups.
 */

import React, { useState } from 'react';
import { SYSTEM_STATUS_LABEL, SYSTEM_STATUS_COLOR } from './types';
import { useT } from '@/lib/i18n';

/* ───────────────────────── Layout ───────────────────────── */

export function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const t = useT();
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

export function Card({ title, icon, status, actions, children, className = '' }: {
  title?: React.ReactNode; icon?: React.ReactNode; status?: React.ReactNode;
  actions?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  const t = useT();
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700/60 overflow-hidden ${className}`}>
      {(title || actions || status) && (
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="text-violet-500 shrink-0">{icon}</span>}
            {title && <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm uppercase tracking-wide truncate">{title}</h3>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {status}
            {actions}
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Grid({ cols = 3, children, className = '' }: { cols?: 1 | 2 | 3 | 4; children: React.ReactNode; className?: string }) {
  const t = useT();
  const map: Record<number, string> = {
    1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3', 4: 'grid-cols-2 md:grid-cols-4',
  };
  return <div className={`grid ${map[cols]} gap-5 ${className}`}>{children}</div>;
}

/* ───────────────────────── Read-only fields ───────────────────────── */

export function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  const t = useT();
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-400 dark:text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-800 dark:text-gray-100 mt-0.5 break-words">{value === undefined || value === null || value === '' ? '—' : value}</dd>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  const t = useT();
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-800 dark:text-gray-100 text-right break-words">{value === undefined || value === null || value === '' ? '—' : value}</dd>
    </div>
  );
}

export function FieldGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div>
      {title && <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{title}</p>}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">{children}</dl>
    </div>
  );
}

/* ───────────────────────── Status ───────────────────────── */

export function StatusDot({ status, label }: { status?: string; label?: string }) {
  const t = useT();
  const color = SYSTEM_STATUS_COLOR[status || ''] || 'text-gray-400';
  const text = label || SYSTEM_STATUS_LABEL[status || ''] || status || '—';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {text}
    </span>
  );
}

export function Pill({ label, color = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' }: { label: string; color?: string }) {
  const t = useT();
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
}

/* ───────────────────────── Stat tiles ───────────────────────── */

export function Stat({ label, value, icon, accent = 'text-violet-500' }: { label: string; value: React.ReactNode; icon?: React.ReactNode; accent?: string }) {
  const t = useT();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/60 p-4 flex items-center gap-3">
      {icon && <span className={`shrink-0 ${accent}`}>{icon}</span>}
      <div className="min-w-0">
        <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-none">{value}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{label}</div>
      </div>
    </div>
  );
}

/* ───────────────────────── Buttons ───────────────────────── */

export function PrimaryBtn({ children, onClick, disabled, type = 'button' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
      {children}
    </button>
  );
}
export function GhostBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-violet-400 disabled:opacity-50 transition-colors">
      {children}
    </button>
  );
}
export function AddBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 border border-dashed border-violet-300 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
      <PlusIcon className="w-3.5 h-3.5" />{children}
    </button>
  );
}
export function IconBtn({ onClick, title, danger, children }: { onClick?: () => void; title?: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`p-1.5 text-gray-400 transition-colors ${danger ? 'hover:text-red-500' : 'hover:text-violet-500'}`}>
      {children}
    </button>
  );
}

/* ───────────────────────── Inputs (edit mode) ───────────────────────── */

export function TextInput({ label, value, onChange, placeholder, type = 'text', className = '' }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  const t = useT();
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <input type={type} className="form-input w-full text-sm" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
export function TextArea({ label, value, onChange, placeholder, rows = 3, className = '' }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string;
}) {
  const t = useT();
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <textarea className="form-input w-full text-sm resize-y" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
export function Select({ label, value, onChange, options, className = '' }: {
  label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string;
}) {
  const t = useT();
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <select className="form-select w-full text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ───────────────────────── Editable table ─────────────────────────
   Generic CRUD table for arrays of objects (keys, codes, contacts, …).
   Columns describe how to render each cell as an input. */

export interface EditableColumn<T> {
  key: keyof T;
  label: string;
  width?: string;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export function EditableTable<T extends { id: string | number }>({ rows, columns, onChange, makeEmpty, addLabel = 'Добавить строку' }: {
  rows: T[];
  columns: EditableColumn<T>[];
  onChange: (rows: T[]) => void;
  makeEmpty: () => T;
  addLabel?: string;
}) {
  const t = useT();
  const update = (id: string | number, key: keyof T, value: any) => onChange(rows.map((r) => r.id === id ? { ...r, [key]: value } : r));
  const remove = (id: string | number) => onChange(rows.filter((r) => r.id !== id));
  const add = () => onChange([...rows, makeEmpty()]);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
              {columns.map((c) => <th key={String(c.key)} className="py-2 pr-3 text-left font-semibold" style={c.width ? { width: c.width } : undefined}>{c.label}</th>)}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="py-4 text-center text-xs text-gray-400">{t('Нет записей')}</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => (
                  <td key={String(c.key)} className="py-1.5 pr-2 align-top">
                    {c.type === 'select' ? (
                      <select className="form-select w-full text-xs py-1.5" value={(r[c.key] as any) ?? ''} onChange={(e) => update(r.id, c.key, e.target.value)}>
                        <option value="">—</option>
                        {(c.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <input
                        type={c.type === 'number' ? 'number' : 'text'}
                        className="form-input w-full text-xs py-1.5"
                        placeholder={c.placeholder}
                        value={(r[c.key] as any) ?? ''}
                        onChange={(e) => update(r.id, c.key, c.type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value)}
                      />
                    )}
                  </td>
                ))}
                <td className="py-1.5 align-top">
                  <IconBtn danger title={t('Удалить')} onClick={() => remove(r.id)}><TrashIcon className="w-4 h-4" /></IconBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddBtn onClick={add}>{addLabel}</AddBtn>
    </div>
  );
}

/* Read-only table (view mode) for arrays. */
export function DataTable<T extends { id: string | number }>({ rows, columns, empty = 'Нет записей' }: {
  rows: T[];
  columns: { key?: keyof T; label: string; render?: (r: T) => React.ReactNode; width?: string }[];
  empty?: string;
}) {
  const t = useT();
  if (!rows.length) return <EmptyState text={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
            {columns.map((c, i) => <th key={i} className="py-2 pr-3 text-left font-semibold" style={c.width ? { width: c.width } : undefined}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
              {columns.map((c, i) => (
                <td key={i} className="py-2 pr-3 text-gray-700 dark:text-gray-200 align-top">
                  {c.render ? c.render(r) : (c.key ? ((r[c.key] as any) ?? '—') : null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────────────────── Misc ───────────────────────── */

export function EmptyState({ text }: { text: string }) {
  const t = useT();
  return <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{text}</div>;
}

export function FileChip({ title, fileType, size, fileUrl, onDelete }: { title: string; fileType?: string; size?: string; fileUrl?: string; onDelete?: () => void }) {
  const inner = (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/30 hover:border-violet-300 dark:hover:border-violet-700 transition-colors group">
      <span className="shrink-0 text-red-400"><FileIcon className="w-5 h-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{title}</p>
        <p className="text-xs text-gray-400">{[fileType, size].filter(Boolean).join(' · ') || '—'}</p>
      </div>
      {onDelete && (
        <button type="button" onClick={(e) => { e.preventDefault(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"><TrashIcon className="w-4 h-4" /></button>
      )}
    </div>
  );
  return fileUrl ? <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">{inner}</a> : inner;
}

/** Simple SVG donut for distribution charts. */
export function Donut({ data, size = 120, thickness = 16 }: { data: { label: string; value: number; color: string }[]; size?: number; thickness?: number }) {
  const t = useT();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={thickness} className="text-gray-100 dark:text-gray-700" />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const dash = `${len} ${c - len}`;
            const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={thickness} strokeDasharray={dash} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </g>
      </svg>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-gray-600 dark:text-gray-300">{d.label}</span>
            <span className="text-gray-400">{d.value} ({Math.round((d.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Toggle between view & edit for a card. */
export function EditToggle({ editing, onEdit, onCancel, onSave, saving }: { editing: boolean; onEdit: () => void; onCancel: () => void; onSave: () => void; saving?: boolean }) {
  const t = useT();
  if (!editing) {
    return <IconBtn title={t('Редактировать')} onClick={onEdit}><PencilIcon className="w-4 h-4" /></IconBtn>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={onCancel} className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700">{t('Отмена')}</button>
      <button type="button" onClick={onSave} disabled={saving} className="px-3 py-1 text-xs font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg disabled:opacity-50">{saving ? '...' : 'Сохранить'}</button>
    </div>
  );
}

/* ───────────────────────── Icons ───────────────────────── */

export const PlusIcon = (p: { className?: string }) => <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
export const TrashIcon = (p: { className?: string }) => <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
export const PencilIcon = (p: { className?: string }) => <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
export const FileIcon = (p: { className?: string }) => <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
export const PhoneIcon = (p: { className?: string }) => <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>;

/* Small editable file list (link-based, stored in passport JSON). */
export function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  return { on, toggle: () => setOn((v) => !v), set: setOn };
}
