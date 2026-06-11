'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import PriceTab from '@/components/company/PriceTab';
import SecurityTab from '@/components/company/SecurityTab';
import RecoveryLogTab from '@/components/company/RecoveryLogTab';
import { useT } from '@/lib/i18n';

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

type TabKey = 'details' | 'banks' | 'price' | 'security' | 'recovery';

const LEGAL_FORMS = ['ООО', 'ИП', 'Самозанятый', 'АО', 'ПАО', 'НКО'];

const INPUT_CLS =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500';

const BLANK_BANK: Omit<BankAccount, 'id'> = {
  bankName: '',
  bik: '',
  settlementAccount: '',
  correspondentAccount: '',
  bankInn: '',
  bankAddress: '',
};

export default function CompanyPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const addToast = useToastStore((st) => st.addToast);

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window !== 'undefined') {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t === 'banks' || t === 'price' || t === 'security' || t === 'recovery' || t === 'details') return t as TabKey;
    }
    return 'details';
  });

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
  const [egrulModal, setEgrulModal] = useState<{
    open: boolean;
    loading: boolean;
    data: EgrulLookupResult | null;
    error: string | null;
    matchedEmployeeId: number | null;
  }>({ open: false, loading: false, data: null, error: null, matchedEmployeeId: null });
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
      addToast('error', 'Заполните ИНН (или ОГРН), затем нажмите ЕГРЮЛ');
      return;
    }
    setEgrulModal({
      open: true,
      loading: true,
      data: null,
      error: null,
      matchedEmployeeId: null,
    });
    try {
      const { data } = await api.get<EgrulLookupResult>('/company-lookup/egrul', {
        params: { query },
      });
      const matchedEmployeeId = data.directorName
        ? findEmployeeByName(data.directorName)
        : null;
      setEgrulModal({
        open: true,
        loading: false,
        data,
        error: null,
        matchedEmployeeId,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;
      let msg = backendMsg || 'Не удалось получить данные из ЕГРЮЛ';
      if (status === 404) msg = 'Организация с таким ИНН/ОГРН не найдена в ЕГРЮЛ';
      if (status === 502) msg = `ФНС временно недоступна${backendMsg ? ` (${backendMsg})` : ''}. Попробуйте через минуту.`;
      if (status === 401) msg = 'Сессия истекла — войдите заново';
      setEgrulModal({
        open: true,
        loading: false,
        data: null,
        error: msg,
        matchedEmployeeId: null,
      });
    }
  };

  const applyEgrulData = () => {
    const data = egrulModal.data;
    if (!data) return;

    if (data.name) setCompanyName(data.name);
    if (data.legalForm) setLegalForm(data.legalForm);
    if (data.inn) setInn(data.inn);
    if (data.kpp) setKpp(data.kpp);
    if (data.ogrn) setOgrn(data.ogrn);
    if (data.legalAddress) {
      setLegalAddress(data.legalAddress);
      if (!actualAddress) setActualAddress(data.legalAddress);
    }
    if (data.directorName) {
      setDirectorNameText(data.directorName);
      setDirectorPosition(data.directorPosition || 'Генеральный директор');
      if (egrulModal.matchedEmployeeId) {
        setDirectorUserId(egrulModal.matchedEmployeeId);
      } else if (directorUserId !== '') {
        setDirectorUserId('');
      }
    }
    setEgrulModal((s) => ({ ...s, open: false }));
    addToast('success', 'Данные применены — не забудьте «Сохранить»');
  };

  const closeEgrulModal = () =>
    setEgrulModal({ open: false, loading: false, data: null, error: null, matchedEmployeeId: null });

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
    <div>
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
            { key: 'price' as TabKey, label: 'Прайс' },
            { key: 'security' as TabKey, label: 'Безопасность' },
            { key: 'recovery' as TabKey, label: 'Восстановления' },
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
                <img src={logoUrl} alt={t('Логотип')} className="w-full h-full object-contain" />
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
                  <option value="">{t('Форма…')}</option>
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
                  placeholder={t('Название организации')}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <Field label={t('ИНН')}>
              <div className="flex gap-2">
                <input
                  value={inn}
                  onChange={(e) => setInn(e.target.value)}
                  className={`${INPUT_CLS} flex-1`}
                  inputMode="numeric"
                  placeholder={t('10 или 12 цифр')}
                />
                <button
                  type="button"
                  onClick={handleEgrulLookup}
                  disabled={egrulModal.loading || (!inn && !ogrn)}
                  title={t('Подтянуть данные из ЕГРЮЛ')}
                  className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg whitespace-nowrap disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                >
                  {egrulModal.loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
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
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  )}
                  Подтянуть из ЕГРЮЛ
                </button>
              </div>
            </Field>
            <Field label={t('КПП')}>
              <input
                value={kpp}
                onChange={(e) => setKpp(e.target.value)}
                className={INPUT_CLS}
                inputMode="numeric"
              />
            </Field>
            <Field label={t('ОГРН')}>
              <input
                value={ogrn}
                onChange={(e) => setOgrn(e.target.value)}
                className={INPUT_CLS}
                inputMode="numeric"
              />
            </Field>
            <Field label={t('Электронная почта')}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLS}
              />
            </Field>

            <Field label={t('Юридический адрес')} className="md:col-span-2">
              <input
                value={legalAddress}
                onChange={(e) => setLegalAddress(e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
            <Field label={t('Фактический адрес')} className="md:col-span-2">
              <input
                value={actualAddress}
                onChange={(e) => setActualAddress(e.target.value)}
                className={INPUT_CLS}
              />
            </Field>

            <Field label={t('Телефон')}>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 ..."
                className={INPUT_CLS}
              />
            </Field>
            <Field label={t('Добавочный')}>
              <input
                value={phoneExt}
                onChange={(e) => setPhoneExt(e.target.value)}
                className={INPUT_CLS}
              />
            </Field>

            <Field label={t('Генеральный директор')}>
              <select
                value={directorUserId === '' ? '' : String(directorUserId)}
                onChange={(e) =>
                  setDirectorUserId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className={INPUT_CLS}
              >
                <option value="">{t('— не назначен —')}</option>
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
            <Field label={t('Главный бухгалтер')}>
              <select
                value={accountantUserId === '' ? '' : String(accountantUserId)}
                onChange={(e) =>
                  setAccountantUserId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className={INPUT_CLS}
              >
                <option value="">{t('— не назначен —')}</option>
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
              <Info label={t('ID аккаунта')} value={String(account.id)} />
              <Info label={t('Поддомен')} value={account.subdomain || '—'} />
              <Info label={t('Статус')} value={String(account.status)} />
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

      {activeTab === 'price' && <PriceTab />}

      {activeTab === 'security' && <SecurityTab />}

      {activeTab === 'recovery' && <RecoveryLogTab />}

      {egrulModal.open && (
        <EgrulModal
          state={egrulModal}
          current={{
            companyName,
            legalForm,
            inn,
            kpp,
            ogrn,
            legalAddress,
            directorUserId: directorUserId === '' ? null : Number(directorUserId),
          }}
          employees={employees}
          onClose={closeEgrulModal}
          onApply={applyEgrulData}
          onRetry={handleEgrulLookup}
        />
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
  const t = useT();
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
  const t = useT();
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
  const t = useT();
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
              title={t('Удалить')}
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
        <Field label={t('Наименование банка')}>
          <input
            value={draft.bankName || ''}
            onChange={(e) => update({ bankName: e.target.value })}
            className={INPUT_CLS}
          />
        </Field>
        <Field label={t('БИК')}>
          <input
            value={draft.bik || ''}
            onChange={(e) => update({ bik: e.target.value })}
            className={INPUT_CLS}
            inputMode="numeric"
          />
        </Field>
        <Field label={t('Расчётный счёт')}>
          <input
            value={draft.settlementAccount || ''}
            onChange={(e) => update({ settlementAccount: e.target.value })}
            className={INPUT_CLS}
            inputMode="numeric"
          />
        </Field>
        <Field label={t('Корреспондентский счёт')}>
          <input
            value={draft.correspondentAccount || ''}
            onChange={(e) => update({ correspondentAccount: e.target.value })}
            className={INPUT_CLS}
            inputMode="numeric"
          />
        </Field>
        <Field label={t('ИНН банка')}>
          <input
            value={draft.bankInn || ''}
            onChange={(e) => update({ bankInn: e.target.value })}
            className={INPUT_CLS}
            inputMode="numeric"
          />
        </Field>
        <Field label={t('Юр. адрес банка')}>
          <input
            value={draft.bankAddress || ''}
            onChange={(e) => update({ bankAddress: e.target.value })}
            className={INPUT_CLS}
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

function EgrulModal({
  state,
  current,
  employees,
  onClose,
  onApply,
  onRetry,
}: {
  state: {
    loading: boolean;
    data: EgrulLookupResult | null;
    error: string | null;
    matchedEmployeeId: number | null;
  };
  current: {
    companyName: string;
    legalForm: string;
    inn: string;
    kpp: string;
    ogrn: string;
    legalAddress: string;
    directorUserId: number | null;
  };
  employees: EmployeeOption[];
  onClose: () => void;
  onApply: () => void;
  onRetry: () => void;
}) {
  const t = useT();
  const { loading, data, error, matchedEmployeeId } = state;
  const matchedEmployee = matchedEmployeeId
    ? employees.find((e) => e.id === matchedEmployeeId)
    : null;

  const rows: Array<{ label: string; current: string; next: string }> = data
    ? [
        { label: 'Форма', current: current.legalForm, next: data.legalForm || '' },
        { label: 'Название', current: current.companyName, next: data.name || '' },
        { label: 'ИНН', current: current.inn, next: data.inn || '' },
        { label: 'КПП', current: current.kpp, next: data.kpp || '' },
        { label: 'ОГРН', current: current.ogrn, next: data.ogrn || '' },
        {
          label: 'Юр. адрес',
          current: current.legalAddress,
          next: data.legalAddress || '',
        },
        {
          label: 'Директор',
          current: '',
          next: data.directorName
            ? `${data.directorName}${data.directorPosition ? ` · ${data.directorPosition}` : ''}`
            : '',
        },
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-violet-600 dark:text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                Данные из ЕГРЮЛ
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Источник: egrul.nalog.ru (ФНС)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Запрашиваем данные из ФНС…
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Обычно занимает 1–3 секунды
              </p>
            </div>
          )}

          {error && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                <svg
                  className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Проверьте, что ИНН введён правильно. Иногда ФНС просит CAPTCHA — повторите
                через минуту.
              </p>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-4">
              {data.isLiquidated && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg text-sm text-amber-800 dark:text-amber-300">
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z"
                    />
                  </svg>
                  Организация числится ликвидированной в ЕГРЮЛ
                </div>
              )}

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">
                        Поле
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">
                        Текущее
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">
                        Из ЕГРЮЛ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.map((row) => {
                      const changed = row.next && row.next !== row.current;
                      return (
                        <tr key={row.label}>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 align-top whitespace-nowrap">
                            {row.label}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300 align-top">
                            {row.current || <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                          <td
                            className={`px-3 py-2 align-top ${
                              changed
                                ? 'text-violet-700 dark:text-violet-300 font-medium'
                                : 'text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {row.next || <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {data.directorName && (
                <div
                  className={`p-3 rounded-lg border text-sm ${
                    matchedEmployee
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {matchedEmployee ? (
                    <>
                      ✓ Директор «{data.directorName}» найден среди сотрудников как{' '}
                      <strong>{matchedEmployee.name}</strong> — будет привязан автоматически.
                    </>
                  ) : (
                    <>
                      ⚠ Директор «{data.directorName}» не найден среди сотрудников. ФИО будет
                      сохранено отдельно, привяжите сотрудника вручную при необходимости.
                    </>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400">
                «Применить» подставит данные в форму — после этого нажмите «Сохранить» на странице,
                чтобы записать их в БД.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          {error && (
            <button
              onClick={onRetry}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Повторить
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {data ? 'Отмена' : 'Закрыть'}
          </button>
          {data && !loading && (
            <button
              onClick={onApply}
              className="px-5 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Применить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
