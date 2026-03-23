'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import api from '@/lib/api';

const COUNTRIES = [
  { name: 'Россия', flag: '🇷🇺', code: '+7', iso: 'RU' },
  { name: 'Казахстан', flag: '🇰🇿', code: '+7', iso: 'KZ' },
  { name: 'Беларусь', flag: '🇧🇾', code: '+375', iso: 'BY' },
  { name: 'Украина', flag: '🇺🇦', code: '+380', iso: 'UA' },
  { name: 'Узбекистан', flag: '🇺🇿', code: '+998', iso: 'UZ' },
  { name: 'Азербайджан', flag: '🇦🇿', code: '+994', iso: 'AZ' },
  { name: 'Армения', flag: '🇦🇲', code: '+374', iso: 'AM' },
  { name: 'Грузия', flag: '🇬🇪', code: '+995', iso: 'GE' },
  { name: 'Кыргызстан', flag: '🇰🇬', code: '+996', iso: 'KG' },
  { name: 'Таджикистан', flag: '🇹🇯', code: '+992', iso: 'TJ' },
  { name: 'Туркменистан', flag: '🇹🇲', code: '+993', iso: 'TM' },
  { name: 'Молдова', flag: '🇲🇩', code: '+373', iso: 'MD' },
  { name: 'Латвия', flag: '🇱🇻', code: '+371', iso: 'LV' },
  { name: 'Литва', flag: '🇱🇹', code: '+370', iso: 'LT' },
  { name: 'Эстония', flag: '🇪🇪', code: '+372', iso: 'EE' },
  { name: 'США', flag: '🇺🇸', code: '+1', iso: 'US' },
  { name: 'Великобритания', flag: '🇬🇧', code: '+44', iso: 'GB' },
  { name: 'Германия', flag: '🇩🇪', code: '+49', iso: 'DE' },
  { name: 'Франция', flag: '🇫🇷', code: '+33', iso: 'FR' },
  { name: 'Турция', flag: '🇹🇷', code: '+90', iso: 'TR' },
  { name: 'Китай', flag: '🇨🇳', code: '+86', iso: 'CN' },
  { name: 'ОАЭ', flag: '🇦🇪', code: '+971', iso: 'AE' },
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch)
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов');
      return;
    }

    setLoading(true);
    try {
      const payload: any = { name, email, password };
      if (phone.trim()) payload.phone = `${selectedCountry.code}${phone.trim()}`;
      if (birthDate) payload.birthDate = birthDate;

      await api.post('/auth/registration-requests', payload);
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Ошибка регистрации')
          : 'Ошибка подключения к серверу';
      console.error('[Register] Failed:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-5 py-4 rounded-xl text-sm text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold text-base mb-1">Заявка отправлена!</p>
          <p>Ваша заявка на регистрацию отправлена. Ожидайте одобрения администратора.</p>
        </div>
        <div className="mt-6 text-center">
          <a
            href="/auth/login"
            className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400"
          >
            Вернуться на страницу входа
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-6">Регистрация</h1>

      {error && (
        <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor="name">
              ФИО <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              className="form-input w-full"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor="email">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              className="form-input w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor="phone">
              Телефон
            </label>
            <div className="flex gap-2">
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => { setShowCountryDropdown(v => !v); setCountrySearch(''); }}
                  className="form-input flex items-center gap-1.5 px-3 whitespace-nowrap min-w-[90px] cursor-pointer"
                >
                  <span className="text-lg leading-none">{selectedCountry.flag}</span>
                  <span className="text-sm font-medium">{selectedCountry.code}</span>
                  <svg className="w-3.5 h-3.5 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showCountryDropdown && (
                  <div className="absolute z-50 mt-1 left-0 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                      <input
                        autoFocus
                        type="text"
                        className="w-full text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 outline-none placeholder-gray-400"
                        placeholder="Поиск страны..."
                        value={countrySearch}
                        onChange={e => setCountrySearch(e.target.value)}
                      />
                    </div>
                    <ul className="max-h-52 overflow-y-auto py-1">
                      {filteredCountries.map(c => (
                        <li key={c.iso}>
                          <button
                            type="button"
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedCountry.iso === c.iso ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' : 'text-gray-700 dark:text-gray-300'}`}
                            onClick={() => { setSelectedCountry(c); setShowCountryDropdown(false); setCountrySearch(''); }}
                          >
                            <span className="text-lg leading-none">{c.flag}</span>
                            <span className="flex-1 text-left">{c.name}</span>
                            <span className="text-gray-400 font-medium">{c.code}</span>
                          </button>
                        </li>
                      ))}
                      {filteredCountries.length === 0 && (
                        <li className="px-4 py-3 text-sm text-gray-400 text-center">Ничего не найдено</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <input
                id="phone"
                className="form-input flex-1"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="999 123 4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor="birthDate">
              Дата рождения
            </label>
            <input
              id="birthDate"
              className="form-input w-full"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor="password">
              Пароль <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                className="form-input w-full pr-10"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                required
                minLength={8}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor="confirmPassword">
              Подтверждение пароля <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                className="form-input w-full pr-10"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                required
                minLength={8}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            className="btn bg-violet-500 hover:bg-violet-600 text-white w-full"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              'Отправить заявку'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <span className="text-sm text-gray-500 dark:text-gray-400">Уже есть аккаунт? </span>
        <a
          href="/auth/login"
          className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400"
        >
          Войти
        </a>
      </div>
    </div>
  );
}
