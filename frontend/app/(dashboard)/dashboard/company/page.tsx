'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

interface AccountData {
  id: number;
  name: string;
  subdomain: string;
  settings: { logoUrl?: string } | null;
  status: string | number;
  legalForm?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  legalAddress?: string | null;
  actualAddress?: string | null;
  phone?: string | null;
  phoneExt?: string | null;
  email?: string | null;
  directorUserId?: number | null;
  accountantUserId?: number | null;
  directorNameText?: string | null;
  directorPosition?: string | null;
  accountantNameText?: string | null;
  accountantPosition?: string | null;
}

interface EgrulLookupResult {
  name?: string;
  shortName?: string;
  legalForm?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  directorName?: string;
  directorPosition?: string;
  isLiquidated?: boolean;
}

interface BankAccount {
  id: number;
  bankName: string;
  bik?: string | null;
  settlementAccount?: string | null;
  correspondentAccount?: string | null;
  bankInn?: string | null;
  bankAddress?: string | null;
}

interface EmployeeOption {
  id: number;
  name: string;
}

type TabKey = 'details' | 'banks';

const LEGAL_FORMS = ['ООО', 'ИП', 'Самозанятый', 'АО', 'ПАО', 'НКО'];

const BLANK_BANK: Omit<BankAccount, 'id'> = {
  bankName: '',
  bik: '',
  settlementAccount: '',
  correspondentAccount: '',
  bankInn: '',
  bankAddress: '',
};

export default function CompanyPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const addToast = useToastStore((st) => st.addToast);

  const [activeTab, setActiveTab] = useState<TabKey>('details');

  // Details state
  const [account, setAccount] = useState<AccountData | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [legalForm, setLegalForm] = useState('');
  const [inn, setInn] = useState('');
  const [kpp, setKpp] = useState('');
  const [ogrn, setOgrn] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [actualAddress, setActualAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneExt, setPhoneExt] = useState('');
  const [email, setEmail] = useState('');
  const [directorUserId, setDirectorUserId] = useState<number | ''>('');
  const [accountantUserId, setAccountantUserId] = useState<number | ''>('');
  const [directorNameText, setDirectorNameText] = useState('');
  const [directorPosition, setDirectorPosition] = useState('');
  const [accountantNameText, setAccountantNameText] = useState('');
  const [accountantPosition, setAccountantPosition] = useState('');

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [egrulLoading, setEgrulLoading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Bank accounts state
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [newBank, setNewBank] = useState<Omit<BankAccount, 'id'> | null>(null);
  const [savingBankId, setSavingBankId] = useState<number | 'new' | null>(null);

  useEffect(() => {
    const code = user?.role?.code;
    if (user && code !== 'admin' && code !== 'super_admin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsRes, usersRes] = await Promise.all([
        api.get('/system-settings'),
        api.get('/users', { params: { limit: 500 } }),
      ]);
      const data: AccountData = settingsRes.data;
      setAccount(data);
      setCompanyName(data.name || '');
      setLogoUrl(data.settings?.logoUrl || '');
      setLegalForm(data.legalForm || '');
      setInn(data.inn || '');
      setKpp(data.kpp || '');
      setOgrn(data.ogrn || '');
      setLegalAddress(data.legalAddress || '');
      setActualAddress(data.actualAddress || '');
      setPhone(data.phone || '');
      setPhoneExt(data.phoneExt || '');
      setEmail(data.email || '');
      setDirectorUserId(data.directorUserId ?? '');
      setAccountantUserId(data.accountantUserId ?? '');
      setDirectorNameText(data.directorNameText || '');
      setDirectorPosition(data.directorPosition || '');
      setAccountantNameText(data.accountantNameText || '');
      setAccountantPosition(data.accountantPosition || '');

      const rawUsers: any[] = Array.isArray(usersRes.data)
        ? usersRes.data
        : (usersRes.data?.data || usersRes.data?.users || []);
      const opts: EmployeeOption[] = rawUsers
        .filter((u) => !u.deletedAt)
        .map((u) => ({
          id: u.id,
          name:
            u.name ||
            [u.firstName, u.lastName].filter(Boolean).join(' ') ||
            u.email ||
            `#${u.id}`,
        }));
      setEmployees(opts);
    } catch {
      addToast('error', 'Не удалось загрузить данные компании');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const loadBanks = useCallback(async () => {
    try {
      setBanksLoading(true);
      const res = await api.get('/company-bank-accounts');
      setBanks(Array.isArray(res.data) ? res.data : []);
    } catch {
      addToast('error', 'Не удалось загрузить банковские реквизиты');
    } finally {
      setBanksLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (activeTab === 'banks') loadBanks();
  }, [activeTab, loadBanks]);

  const handleLogoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    formData.append('file', files[0]);
    try {
      setUploadingLogo(true);
      const { data } = await api.post('/users/avatar/upload', formData);
      setLogoUrl(data.fileUrl || data.url || '');
      addToast('success', 'Логотип загружен');
    } catch {
      addToast('error', 'Ошибка загрузки логотипа');
    } finally {
      setUploadingLogo(false);
    }
  };

  const normalizeName = (s: string) =>
    s
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^а-яa-z\s]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  const findEmployeeByName = (fio: string): number | null => {
    const target = normalizeName(fio);
    if (!target) return null;
    const targetParts = target.split(' ').filter(Boolean);
    if (!targetParts.length) return null;

    // 1) Точное совпадение полной строки
    const exact = employees.find((e) => normalizeName(e.name) === target);
    if (exact) return exact.id;

    // 2) Все части ЕГРЮЛ-ФИО присутствуют в имени сотрудника (в любом порядке)
    const matched = employees.find((e) => {
      const empParts = normalizeName(e.name).split(' ').filter(Boolean);
      return targetParts.every((p) =>
        empParts.some((ep) => ep === p || ep.startsWith(p) || p.startsWith(ep)),
      );
    });
    return matched?.id ?? null;
  };

  const handleEgrulLookup = async () => {
    const query = (inn || ogrn || '').trim();
    if (!query) {
      addToast('error', 'Заполните ИНН (или ОГРН)');
      return;
    }
    try {
      setEgrulLoading(true);
      const { data } = await api.get<EgrulLookupResult>('/company-lookup/egrul', {
        params: { query },
      });

      if (data.isLiquidated) {
        addToast('error', 'Организация ликвидирована — данные подтянуты, проверьте');
      }

      if (data.name) setCompanyName(data.name);
      if (data.legalForm) setLegalForm(data.legalForm);
      if (data.inn) setInn(data.inn);
      if (data.kpp) setKpp(data.kpp);
      if (data.ogrn) setOgrn(data.ogrn);
      if (data.legalAddress) {
        setLegalAddress(data.legalAddress);
        // Если фактический адрес пустой — продублируем
        if (!actualAddress) setActualAddress(data.legalAddress);
      }

      if (data.directorName) {
        setDirectorNameText(data.directorName);
        setDirectorPosition(data.directorPosition || 'Генеральный директор');
        const matchedId = findEmployeeByName(data.directorName);
        if (matchedId) {
          setDirectorUserId(matchedId);
          addToast('success', `Данные подтянуты, директор найден в сотрудниках`);
        } else {
          // Сбрасываем FK, если ранее был выбран другой сотрудник
          if (directorUserId !== '') setDirectorUserId('');
          addToast(
            'success',
            'Данные подтянуты. Директор из ЕГРЮЛ не найден среди сотрудников',
          );
        }
      } else if (!data.isLiquidated) {
        addToast('success', 'Данные подтянуты из ЕГРЮЛ');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Не удалось получить данные из ЕГРЮЛ';
      addToast('error', String(msg));
    } finally {
      setEgrulLoading(false);
    }
  };

  const saveDetails = async () => {
    try {
      setSaving(true);
      await api.put('/system-settings', {
        name: companyName,
        settings: { logoUrl },
        legalForm: legalForm || '',
        inn: inn || '',
        kpp: kpp || '',
        ogrn: ogrn || '',
        legalAddress: legalAddress || '',
        actualAddress: actualAddress || '',
        phone: phone || '',
        phoneExt: phoneExt || '',
        email: email || '',
        directorUserId: directorUserId === '' ? null : Number(directorUserId),
        accountantUserId:
          accountantUserId === '' ? null : Number(accountantUserId),
        directorNameText: directorNameText || '',
        directorPosition: directorPosition || '',
        accountantNameText: accountantNameText || '',
        accountantPosition: accountantPosition || '',
      });
      addToast('success', 'Реквизиты сохранены');
    } catch {
      addToast('error', 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const createBank = async () => {
    if (!newBank) return;
    if (!newBank.bankName.trim()) {
      addToast('error', 'Укажите наименование банка');
      return;
    }
    try {
      setSavingBankId('new');
      await api.post('/company-bank-accounts', newBank);
      setNewBank(null);
      await loadBanks();
      addToast('success', 'Банк добавлен');
    } catch {
      addToast('error', 'Не удалось добавить банк');
    } finally {
      setSavingBankId(null);
    }
  };

  const updateBank = async (id: number, patch: Partial<BankAccount>) => {
    try {
      setSavingBankId(id);
      await api.put(`/company-bank-accounts/${id}`, patch);
      setBanks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    } catch {
      addToast('error', 'Не удалось сохранить');
    } finally {
      setSavingBankId(null);
    }
  };

  const deleteBank = async (id: number) => {
    if (!confirm('Удалить банковские реквизиты?')) return;
    try {
      await api.delete(`/company-bank-accounts/${id}`);
      setBanks((prev) => prev.filter((b) => b.id !== id));
      addToast('success', 'Удалено');
    } catch {
      addToast('error', 'Не удалось удалить');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
          Компания
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Профиль организации, реквизиты и расчётные счета
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {[
            { key: 'details' as TabKey, label: 'Реквизиты' },
            { key: 'banks' as TabKey, label: 'Счета (банки)' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'details' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-6 space-y-6">
          {/* Logo */}
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Логотип" className="w-full h-full object-contain" />
              ) : (
                <svg
                  className="w-9 h-9 text-gray-300 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                  />
                </svg>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Логотип компании
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                PNG, JPG до 5 МБ. Рекомендуется квадратное изображение.
              </p>
              <div className="flex items-center gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoUpload(e.target.files)}
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploadingLogo ? (
                    <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                  )}
                  {uploadingLogo ? 'Загрузка...' : 'Загрузить'}
                </button>
                {logoUrl && (
                  <button
                    onClick={() => setLogoUrl('')}
                    className="text-xs text-red-500 hover:text-red-600 transition-colors"
                  >
                    Удалить
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700/60 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Наименование компании
              </label>
              <div className="flex gap-2">
                <select
                  value={legalForm}
                  onChange={(e) => setLegalForm(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Форма…</option>
                  {LEGAL_FORMS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Название организации"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <Field label="ИНН">
              <div className="flex gap-2">
                <input
                  value={inn}
                  onChange={(e) => setInn(e.target.value)}
                  className="form-input-base flex-1"
                  inputMode="numeric"
                  placeholder="10 или 12 цифр"
                />
                <button
                  type="button"
                  onClick={handleEgrulLookup}
                  disabled={egrulLoading || (!inn && !ogrn)}
                  title="Подтянуть данные из ЕГРЮЛ"
                  className="px-3 py-2 text-xs font-medium bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 text-violet-700 dark:text-violet-300 rounded-lg whitespace-nowrap disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {egrulLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  )}
                  ЕГРЮЛ
                </button>
              </div>
            </Field>
            <Field label="КПП">
              <input
                value={kpp}
                onChange={(e) => setKpp(e.target.value)}
                className="form-input-base"
                inputMode="numeric"
              />
            </Field>
            <Field label="ОГРН">
              <input
                value={ogrn}
                onChange={(e) => setOgrn(e.target.value)}
                className="form-input-base"
                inputMode="numeric"
              />
            </Field>
            <Field label="Электронная почта">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input-base"
              />
            </Field>

            <Field label="Юридический адрес" className="md:col-span-2">
              <input
                value={legalAddress}
                onChange={(e) => setLegalAddress(e.target.value)}
                className="form-input-base"
              />
            </Field>
            <Field label="Фактический адрес" className="md:col-span-2">
              <input
                value={actualAddress}
                onChange={(e) => setActualAddress(e.target.value)}
                className="form-input-base"
              />
            </Field>

            <Field label="Телефон">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 ..."
                className="form-input-base"
              />
            </Field>
            <Field label="Добавочный">
              <input
                value={phoneExt}
                onChange={(e) => setPhoneExt(e.target.value)}
                className="form-input-base"
              />
            </Field>

            <Field label="Генеральный директор">
              <select
                value={directorUserId === '' ? '' : String(directorUserId)}
                onChange={(e) =>
                  setDirectorUserId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="form-input-base"
              >
                <option value="">— не назначен —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              {directorNameText && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Из ЕГРЮЛ:{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {directorNameText}
                  </span>
                  {directorPosition && <> · {directorPosition}</>}
                  {!directorUserId && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">
                      — не найден среди сотрудников
                    </span>
                  )}
                </p>
              )}
            </Field>
            <Field label="Главный бухгалтер">
              <select
                value={accountantUserId === '' ? '' : String(accountantUserId)}
                onChange={(e) =>
                  setAccountantUserId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="form-input-base"
              >
                <option value="">— не назначен —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              {accountantNameText && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Из ЕГРЮЛ:{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {accountantNameText}
                  </span>
                  {accountantPosition && <> · {accountantPosition}</>}
                  {!accountantUserId && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">
                      — не найден среди сотрудников
                    </span>
                  )}
                </p>
              )}
            </Field>
          </div>

          {account && (
            <div className="border-t border-gray-100 dark:border-gray-700/60 pt-4 grid grid-cols-3 gap-4">
              <Info label="ID аккаунта" value={String(account.id)} />
              <Info label="Поддомен" value={account.subdomain || '—'} />
              <Info label="Статус" value={String(account.status)} />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={saveDetails}
              disabled={saving}
              className="px-5 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          <style jsx>{`
            :global(.form-input-base) {
              width: 100%;
              padding: 0.5rem 0.75rem;
              font-size: 0.875rem;
              border: 1px solid rgb(209 213 219);
              border-radius: 0.5rem;
              background-color: #fff;
              color: rgb(17 24 39);
            }
            :global(.dark .form-input-base) {
              background-color: rgb(55 65 81);
              border-color: rgb(75 85 99);
              color: rgb(243 244 246);
            }
            :global(.form-input-base:focus) {
              outline: none;
              box-shadow: 0 0 0 2px rgb(139 92 246);
            }
          `}</style>
        </div>
      )}

      {activeTab === 'banks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Расчётные счета компании. Можно добавить неограниченное количество банков.
            </p>
            {!newBank && (
              <button
                onClick={() => setNewBank({ ...BLANK_BANK })}
                className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Добавить расчётный счёт
              </button>
            )}
          </div>

          {banksLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {newBank && (
            <BankCard
              value={newBank}
              onChange={(patch) => setNewBank((prev) => (prev ? { ...prev, ...patch } : prev))}
              onCancel={() => setNewBank(null)}
              onSave={createBank}
              saving={savingBankId === 'new'}
              isNew
            />
          )}

          {!banksLoading && banks.length === 0 && !newBank && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Ещё не добавлено ни одного банка
            </div>
          )}

          {banks.map((b) => (
            <BankCard
              key={b.id}
              value={b}
              onSaveField={(patch) => updateBank(b.id, patch)}
              onDelete={() => deleteBank(b.id)}
              saving={savingBankId === b.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{value}</p>
    </div>
  );
}

function BankCard({
  value,
  onChange,
  onSaveField,
  onCancel,
  onSave,
  onDelete,
  saving,
  isNew,
}: {
  value: Omit<BankAccount, 'id'> & { id?: number };
  onChange?: (patch: Partial<BankAccount>) => void;
  onSaveField?: (patch: Partial<BankAccount>) => void;
  onCancel?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  saving?: boolean;
  isNew?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!isNew) setDraft(value);
  }, [value, isNew]);

  const update = (patch: Partial<BankAccount>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
    if (onChange) onChange(patch);
  };

  const commit = () => {
    if (!dirty || !onSaveField) return;
    onSaveField({
      bankName: draft.bankName,
      bik: draft.bik,
      settlementAccount: draft.settlementAccount,
      correspondentAccount: draft.correspondentAccount,
      bankInn: draft.bankInn,
      bankAddress: draft.bankAddress,
    });
    setDirty(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
          {isNew
            ? 'Новый банк'
            : draft.bankName || `Банк #${(draft as BankAccount).id}`}
        </h3>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          )}
          {!isNew && dirty && (
            <button
              onClick={commit}
              className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg"
            >
              Сохранить
            </button>
          )}
          {!isNew && onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              title="Удалить"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Наименование банка">
          <input
            value={draft.bankName || ''}
            onChange={(e) => update({ bankName: e.target.value })}
            className="form-input-base"
          />
        </Field>
        <Field label="БИК">
          <input
            value={draft.bik || ''}
            onChange={(e) => update({ bik: e.target.value })}
            className="form-input-base"
            inputMode="numeric"
          />
        </Field>
        <Field label="Расчётный счёт">
          <input
            value={draft.settlementAccount || ''}
            onChange={(e) => update({ settlementAccount: e.target.value })}
            className="form-input-base"
            inputMode="numeric"
          />
        </Field>
        <Field label="Корреспондентский счёт">
          <input
            value={draft.correspondentAccount || ''}
            onChange={(e) => update({ correspondentAccount: e.target.value })}
            className="form-input-base"
            inputMode="numeric"
          />
        </Field>
        <Field label="ИНН банка">
          <input
            value={draft.bankInn || ''}
            onChange={(e) => update({ bankInn: e.target.value })}
            className="form-input-base"
            inputMode="numeric"
          />
        </Field>
        <Field label="Юр. адрес банка">
          <input
            value={draft.bankAddress || ''}
            onChange={(e) => update({ bankAddress: e.target.value })}
            className="form-input-base"
          />
        </Field>
      </div>

      {isNew && (
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-2"
          >
            {saving && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Добавить
          </button>
        </div>
      )}
    </div>
  );
}
