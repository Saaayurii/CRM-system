'use client';

import { useState, useEffect, useRef } from 'react';
import type { FormField } from '@/types/admin';
import api from '@/lib/api';

function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className="form-input w-full pr-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title={show ? 'Скрыть' : 'Показать'}
      >
        {show ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

interface EntityFormModalProps {
  open: boolean;
  title: string;
  fields: FormField[];
  initialData?: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  loading?: boolean;
}

export default function EntityFormModal({
  open,
  title,
  fields,
  initialData,
  onClose,
  onSubmit,
  loading,
}: EntityFormModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [asyncOptions, setAsyncOptions] = useState<Record<string, { value: string | number; label: string }[]>>({});
  const [uploadingFields, setUploadingFields] = useState<Set<string>>(new Set());
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (open) {
      const defaults: Record<string, unknown> = {};
      fields.forEach((f) => {
        defaults[f.key] = initialData?.[f.key] ?? (f.type === 'checkbox' ? false : '');
      });
      setFormData(defaults);

      // Fetch async options for fields that need them
      const asyncFields = fields.filter((f) => f.fetchOptions);
      asyncFields.forEach((f) => {
        if (!f.fetchOptions) return;
        const { endpoint, valueKey, labelKey } = f.fetchOptions;
        api.get(endpoint, { params: { limit: 200 } })
          .then(({ data }) => {
            const arr = Array.isArray(data)
              ? data
              : (Object.values(data as Record<string, unknown>).find((v) => Array.isArray(v)) as unknown[]) ?? [];
            const opts = (arr as Record<string, unknown>[]).map((item) => ({
              value: item[valueKey] as string | number,
              label: String(item[labelKey] ?? ''),
            }));
            setAsyncOptions((prev) => ({ ...prev, [f.key]: opts }));
          })
          .catch(() => {});
      });
    }
  }, [open, initialData, fields]);

  if (!open) return null;

  const handleChange = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = async (field: FormField, file: File | null) => {
    if (!file || !field.uploadEndpoint) return;
    setUploadingFields((prev) => new Set(prev).add(field.key));
    setUploadErrors((prev) => ({ ...prev, [field.key]: '' }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      // Do NOT set Content-Type manually — axios will set multipart/form-data with correct boundary
      const { data } = await api.post(field.uploadEndpoint, fd, {
        headers: { 'Content-Type': undefined },
      });
      handleChange(field.key, data.fileUrl);
    } catch {
      setUploadErrors((prev) => ({ ...prev, [field.key]: 'Ошибка загрузки файла' }));
    } finally {
      setUploadingFields((prev) => {
        const next = new Set(prev);
        next.delete(field.key);
        return next;
      });
    }
  };

  // Fields that must never be sent in request body (always server-managed)
  const SERVER_FIELDS = new Set(['id', 'accountId', 'createdAt', 'updatedAt', 'deletedAt']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = Object.fromEntries(
      Object.entries(formData).filter(
        ([k, v]) => !SERVER_FIELDS.has(k) && v !== '' && v !== null && v !== undefined
      )
    );
    onSubmit(cleaned);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 w-full max-w-full sm:max-w-md h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/60 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              {field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={!!formData[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.checked)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{field.label}</span>
                </label>
              ) : (
                <>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      className="form-select w-full"
                      value={String(formData[field.key] ?? '')}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const opts = asyncOptions[field.key] ?? field.options ?? [];
                        const isNumeric = opts.some((o) => typeof o.value === 'number');
                        handleChange(field.key, isNumeric && raw !== '' ? Number(raw) : raw);
                      }}
                      required={field.required}
                    >
                      <option value="">Выберите...</option>
                      {(asyncOptions[field.key] ?? field.options ?? []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'password' ? (
                    <PasswordInput
                      value={String(formData[field.key] ?? '')}
                      onChange={(v) => handleChange(field.key, v)}
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  ) : field.type === 'textarea' ? (
                    <textarea
                      className="form-textarea w-full"
                      rows={4}
                      value={String(formData[field.key] ?? '')}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  ) : field.type === 'file' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[field.key]?.click()}
                          disabled={uploadingFields.has(field.key)}
                          className="btn-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                          {uploadingFields.has(field.key) ? (
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                              Загрузка...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              Выбрать файл
                            </span>
                          )}
                        </button>
                        {formData[field.key] ? (
                          <a
                            href={String(formData[field.key])}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-violet-500 hover:text-violet-600 truncate max-w-[180px]"
                            title={String(formData[field.key])}
                          >
                            {String(formData[field.key]).split('/').pop()}
                          </a>
                        ) : null}
                      </div>
                      {uploadErrors[field.key] && (
                        <p className="text-xs text-red-500">{uploadErrors[field.key]}</p>
                      )}
                      <input
                        ref={(el) => { fileInputRefs.current[field.key] = el; }}
                        type="file"
                        accept={field.accept}
                        className="hidden"
                        onChange={(e) => handleFileChange(field, e.target.files?.[0] ?? null)}
                      />
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      className="form-input w-full"
                      value={String(formData[field.key] ?? '')}
                      onChange={(e) =>
                        handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)
                      }
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  )}
                </>
              )}
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/60">
            <button
              type="button"
              onClick={onClose}
              className="btn-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-sm bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : initialData ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
