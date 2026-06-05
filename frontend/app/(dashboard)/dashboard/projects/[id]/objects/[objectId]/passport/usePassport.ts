'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import type { ObjectSite, ObjectPassport, PassportHistoryEntry, PassportSectionKey } from './types';

/**
 * Context object passed down to every passport section. Sections render their
 * slice of `passport[section]` and persist via `savePassportSection`.
 */
export interface PassportCtx {
  projectId: number;
  objectId: number;
  site: ObjectSite | null;
  passport: ObjectPassport;
  history: PassportHistoryEntry[];
  loading: boolean;
  /** Whole-section replace: PATCH /construction-sites/:id/passport */
  savePassportSection: (section: PassportSectionKey, data: any) => Promise<void>;
  /** Core construction-site fields: PUT /construction-sites/:id */
  saveCore: (patch: Partial<ObjectSite>) => Promise<void>;
  /** Upload a file, returns its URL. */
  uploadFile: (file: File) => Promise<string>;
  currentUserName: string;
  reload: () => Promise<void>;
}

export function usePassport(projectId: number, objectId: number) {
  const addToast = useToastStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const [site, setSite] = useState<ObjectSite | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const r = await api.get(`/construction-sites/${objectId}`);
      setSite(r.data);
    } catch {
      addToast('error', 'Не удалось загрузить объект');
    } finally {
      setLoading(false);
    }
  }, [objectId, addToast]);

  useEffect(() => { reload(); }, [reload]);

  const savePassportSection = useCallback(async (section: PassportSectionKey, data: any) => {
    try {
      const r = await api.patch(`/construction-sites/${objectId}/passport`, {
        section,
        data,
        userName: user?.name,
      });
      setSite((prev) => prev ? { ...prev, passport: r.data.passport, passportHistory: r.data.passportHistory } : prev);
      addToast('success', 'Сохранено');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join('; ') : (msg || 'Ошибка при сохранении'));
      throw e;
    }
  }, [objectId, user?.name, addToast]);

  const saveCore = useCallback(async (patch: Partial<ObjectSite>) => {
    try {
      const r = await api.put(`/construction-sites/${objectId}`, patch);
      setSite((prev) => prev ? { ...prev, ...(r.data || patch) } : prev);
      addToast('success', 'Сохранено');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join('; ') : (msg || 'Ошибка при сохранении'));
      throw e;
    }
  }, [objectId, addToast]);

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('files', file);
    const res = await api.post('/chat-channels/upload', form);
    const uploaded = Array.isArray(res.data) ? res.data[0] : res.data;
    return uploaded?.fileUrl || uploaded?.url || '';
  }, []);

  const ctx: PassportCtx = {
    projectId,
    objectId,
    site,
    passport: site?.passport || {},
    history: Array.isArray(site?.passportHistory) ? site!.passportHistory! : [],
    loading,
    savePassportSection,
    saveCore,
    uploadFile,
    currentUserName: user?.name || 'Пользователь',
    reload,
  };

  return ctx;
}
