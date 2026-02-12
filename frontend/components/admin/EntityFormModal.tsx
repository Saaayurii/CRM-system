'use client';

import { useState, useEffect } from 'react';
import type { FormField } from '@/types/admin';

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

  useEffect(() => {
    if (open) {
      const defaults: Record<string, unknown> = {};
      fields.forEach((f) => {
        defaults[f.key] = initialData?.[f.key] ?? (f.type === 'checkbox' ? false : '');
      });
      setFormData(defaults);
    }
  }, [open, initialData, fields]);

  if (!open) return null;

  const handleChange = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      required={field.required}
                    >
                      <option value="">Выберите...</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      className="form-textarea w-full"
                      rows={4}
                      value={String(formData[field.key] ?? '')}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                    />
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
