'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useDraft } from '@/hooks/useDraft';
import DraftBanner from '@/components/ui/DraftBanner';

interface Team {
  id: number;
  name: string;
}

interface UserOption {
  id: number;
  name: string;
  email: string;
}

interface ProjectData {
  id?: number;
  name?: string;
  description?: string;
  status?: number;
  priority?: number;
  budget?: number;
  actualCost?: number;
  startDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  start_date?: string;
  planned_end_date?: string;
  actual_end_date?: string;
  teamId?: number;
  team_id?: number;
  address?: string;
  clientName?: string;
  client_name?: string;
  settings?: Record<string, any>;
  projectManager?: { id: number; name: string; email: string };
  projectManagerId?: number;
  managerId?: number;
  manager_id?: number;
}

interface ProjectFormModalProps {
  project?: ProjectData | null;
  onClose: () => void;
  onSaved: (updated?: any) => void;
}

const STATUS_OPTIONS = [
  { value: 0, label: 'Планирование' },
  { value: 1, label: 'Активный' },
  { value: 2, label: 'Приостановлен' },
  { value: 3, label: 'Завершён' },
  { value: 4, label: 'Отменён' },
];

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Низкий' },
  { value: 2, label: 'Средний' },
  { value: 3, label: 'Высокий' },
  { value: 4, label: 'Критический' },
];

function toDateInput(d?: string): string {
  if (!d) return '';
  return d.slice(0, 10);
}

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const LABEL_CLS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function ProjectFormModal({ project, onClose, onSaved }: ProjectFormModalProps) {
  const isEdit = !!project?.id;

  const initialDraft = {
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status ?? 0,
    priority: project?.priority ?? 2,
    budget: project?.budget != null ? String(project.budget) : '',
    actualCost: project?.actualCost != null ? String(project.actualCost) : '',
    startDate: toDateInput(project?.startDate || project?.start_date),
    plannedEndDate: toDateInput(project?.plannedEndDate || project?.planned_end_date),
    actualEndDate: toDateInput(project?.actualEndDate || project?.actual_end_date),
    teamId: String(project?.teamId || project?.team_id || ''),
    managerId: String(project?.projectManagerId || project?.managerId || project?.manager_id || project?.projectManager?.id || ''),
    address: project?.address || '',
    clientName: project?.clientName || project?.client_name || '',
    notes: project?.settings?.notes || '',
  };

  const draft = useDraft('project:new', initialDraft);

  const [name, setName] = useState(initialDraft.name);
  const [description, setDescription] = useState(initialDraft.description);
  const [status, setStatus] = useState<number>(initialDraft.status);
  const [priority, setPriority] = useState<number>(initialDraft.priority);
  const [budget, setBudget] = useState<string>(initialDraft.budget);
  const [actualCost, setActualCost] = useState<string>(initialDraft.actualCost);
  const [startDate, setStartDate] = useState(initialDraft.startDate);
  const [plannedEndDate, setPlannedEndDate] = useState(initialDraft.plannedEndDate);
  const [actualEndDate, setActualEndDate] = useState(initialDraft.actualEndDate);
  const [teamId, setTeamId] = useState<number | ''>(initialDraft.teamId ? Number(initialDraft.teamId) : '');
  const [managerId, setManagerId] = useState<number | ''>(initialDraft.managerId ? Number(initialDraft.managerId) : '');
  const [address, setAddress] = useState(initialDraft.address);
  const [clientName, setClientName] = useState(initialDraft.clientName);
  const [notes, setNotes] = useState<string>(initialDraft.notes);

  const applyDraft = useCallback((d: typeof initialDraft) => {
    setName(d.name); setDescription(d.description); setStatus(Number(d.status));
    setPriority(Number(d.priority)); setBudget(d.budget); setActualCost(d.actualCost);
    setStartDate(d.startDate); setPlannedEndDate(d.plannedEndDate); setActualEndDate(d.actualEndDate);
    setTeamId(d.teamId ? Number(d.teamId) : ''); setManagerId(d.managerId ? Number(d.managerId) : '');
    setAddress(d.address); setClientName(d.clientName); setNotes(d.notes);
  }, []);

  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, usersRes] = await Promise.all([
          api.get('/teams').catch(() => ({ data: {} })),
          api.get('/users', { params: { limit: 500 } }).catch(() => ({ data: {} })),
        ]);
        setTeams(teamsRes.data?.data || teamsRes.data?.teams || []);
        setUsers(usersRes.data?.users || usersRes.data?.data || []);
      } catch {}
    };
    fetchData();
  }, []);

  // Auto-save draft on field changes (only for new projects)
  useEffect(() => {
    if (isEdit) return;
    draft.set({ name, description, status, priority, budget, actualCost, startDate, plannedEndDate, actualEndDate, teamId: String(teamId), managerId: String(managerId), address, clientName, notes });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, name, description, status, priority, budget, actualCost, startDate, plannedEndDate, actualEndDate, teamId, managerId, address, clientName, notes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Название обязательно');
      return;
    }
    setLoading(true);
    setError('');

    const payload: Record<string, unknown> = {
      name: name.trim(),
      status,
      priority,
    };
    if (description.trim()) payload.description = description.trim();
    if (budget) payload.budget = Number(budget);
    if (actualCost) payload.actualCost = Number(actualCost);
    if (startDate) payload.startDate = startDate;
    if (plannedEndDate) payload.plannedEndDate = plannedEndDate;
    if (actualEndDate) payload.actualEndDate = actualEndDate;
    if (managerId) payload.projectManagerId = managerId;
    if (address.trim()) payload.address = address.trim();
    if (clientName.trim()) payload.clientName = clientName.trim();
    payload.settings = { ...(project?.settings || {}), notes: notes.trim() };

    try {
      let updated: any;
      if (isEdit) {
        const res = await api.put(`/projects/${project!.id}`, payload);
        updated = res.data;
      } else {
        const res = await api.post('/projects', payload);
        updated = res.data;
        draft.clearDraft();
      }
      onSaved(updated);
    } catch {
      setError(isEdit ? 'Не удалось обновить проект' : 'Не удалось создать проект');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {isEdit ? 'Редактировать проект' : 'Создать проект'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!isEdit && draft.hasDraft && (
          <DraftBanner
            onRestore={() => { draft.restoreDraft(); applyDraft(draft.value); }}
            onDiscard={() => draft.clearDraft()}
          />
        )}

        {error && (
          <div className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL_CLS}>Название <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={INPUT_CLS}
              placeholder="Название проекта"
            />
          </div>

          <div>
            <label className={LABEL_CLS}>Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${INPUT_CLS} resize-none`}
              placeholder="Описание проекта"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Статус</label>
              <select value={status} onChange={(e) => setStatus(Number(e.target.value))} className={INPUT_CLS}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Приоритет</label>
              <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} className={INPUT_CLS}>
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Руководитель</label>
              <select value={managerId} onChange={(e) => setManagerId(e.target.value ? Number(e.target.value) : '')} className={INPUT_CLS}>
                <option value="">Не выбран</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Клиент</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className={INPUT_CLS}
                placeholder="Название клиента"
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Адрес</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={INPUT_CLS}
              placeholder="Адрес объекта"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Бюджет</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min={0}
                className={INPUT_CLS}
                placeholder="0"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Фактические затраты</label>
              <input
                type="number"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                min={0}
                className={INPUT_CLS}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={LABEL_CLS}>Дата начала</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Плановое окончание</label>
              <input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Фактическое окончание</label>
              <input type="date" value={actualEndDate} onChange={(e) => setActualEndDate(e.target.value)} className={INPUT_CLS} />
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Команда</label>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : '')} className={INPUT_CLS}>
              <option value="">Не выбрана</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLS}>Заметки</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`${INPUT_CLS} resize-none`}
              placeholder="Дополнительные заметки..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
