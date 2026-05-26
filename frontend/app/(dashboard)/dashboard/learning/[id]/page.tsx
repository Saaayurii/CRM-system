'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

interface TrainingMaterial {
  id: number;
  title: string;
  materialType?: string;
  content?: string;
  fileUrl?: string;
  coverUrl?: string;
  category?: string;
  difficultyLevel?: string;
  durationMinutes?: number;
  description?: string;
  tags?: string[] | unknown;
  isPublished?: boolean;
  isMandatory?: boolean;
  viewCount?: number;
  targetRoleIds?: number[] | unknown;
}

interface TrainingProgress {
  id: number;
  userId: number;
  trainingMaterialId: number;
  startedAt?: string | null;
  completedAt?: string | null;
  progressPercentage: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex?: number; // backend may not send to user; tolerate undefined
}

interface KnowledgeTest {
  id: number;
  title: string;
  description?: string;
  passingScore?: number;
  timeLimitMinutes?: number;
  questions?: QuizQuestion[] | unknown;
  isMandatory?: boolean;
  isActive?: boolean;
  trainingMaterialId?: number;
}

interface TestAttempt {
  id: number;
  knowledgeTestId: number;
  userId: number;
  startedAt: string;
  completedAt?: string | null;
  score?: number | null;
  passed?: boolean | null;
  answers?: unknown;
  attemptNumber?: number;
}

const TYPE_META: Record<string, { label: string; emoji: string; badge: string; gradient: string }> = {
  video:        { label: 'Видео',       emoji: '▶',  badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', gradient: 'from-purple-500/20 to-fuchsia-500/20' },
  article:      { label: 'Статья',      emoji: '📄', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',         gradient: 'from-blue-500/20 to-sky-500/20' },
  instruction:  { label: 'Инструкция',  emoji: '📋', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', gradient: 'from-orange-500/20 to-amber-500/20' },
  checklist:    { label: 'Чек-лист',    emoji: '✅', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',     gradient: 'from-emerald-500/20 to-teal-500/20' },
  presentation: { label: 'Презентация', emoji: '🖼', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', gradient: 'from-yellow-500/20 to-orange-500/20' },
};

function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace('/', '');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.replace('/', '');
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    // not a URL
  }
  return null;
}

export default function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const materialId = Number(id);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);

  const [material, setMaterial] = useState<TrainingMaterial | null>(null);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [tests, setTests] = useState<KnowledgeTest[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);

  const [activeTestId, setActiveTestId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, tRes] = await Promise.all([
        api.get(`/training-materials/${materialId}`),
        api.get('/knowledge-tests', { params: { trainingMaterialId: materialId, limit: 50 } }),
      ]);
      setMaterial(mRes.data);
      const tArr: KnowledgeTest[] = Array.isArray(tRes.data) ? tRes.data : (tRes.data?.data ?? tRes.data?.items ?? []);
      setTests(tArr.filter((t) => t.isActive !== false));

      if (user?.id) {
        try {
          const { data: pData } = await api.get('/training-progress', { params: { userId: user.id, trainingMaterialId: materialId, limit: 1 } });
          const pArr: TrainingProgress[] = Array.isArray(pData) ? pData : (pData?.data ?? pData?.items ?? []);
          setProgress(pArr[0] ?? null);
        } catch { /* ignore */ }

        // Best-effort attempts list for this user's tests
        if (tArr.length > 0) {
          try {
            const { data: aData } = await api.get('/test-attempts', { params: { userId: user.id, limit: 200 } });
            const aArr: TestAttempt[] = Array.isArray(aData) ? aData : (aData?.data ?? aData?.items ?? []);
            const testIds = new Set(tArr.map((t) => t.id));
            setAttempts(aArr.filter((a) => testIds.has(a.knowledgeTestId)));
          } catch { /* ignore */ }
        }
      }
    } catch {
      addToast('error', 'Материал не найден или нет доступа');
      router.push('/dashboard/learning');
    } finally {
      setLoading(false);
    }
  }, [materialId, user?.id, addToast, router]);

  useEffect(() => {
    if (!Number.isFinite(materialId)) {
      router.push('/dashboard/learning');
      return;
    }
    fetchAll();
  }, [fetchAll, materialId, router]);

  // Auto-start
  useEffect(() => {
    if (!material || !user?.id || progress) return;
    persistProgress(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material, user?.id]);

  const persistProgress = async (pct: number) => {
    if (!user?.id || !material) return;
    setSavingProgress(true);
    try {
      if (progress) {
        const body: Record<string, unknown> = { progressPercentage: pct };
        if (pct >= 100) body.completedAt = new Date().toISOString();
        const { data } = await api.put(`/training-progress/${progress.id}`, body);
        setProgress(data as TrainingProgress);
      } else {
        const body: Record<string, unknown> = {
          userId: user.id,
          trainingMaterialId: material.id,
          startedAt: new Date().toISOString(),
          progressPercentage: pct,
        };
        if (pct >= 100) body.completedAt = new Date().toISOString();
        const { data } = await api.post('/training-progress', body);
        setProgress(data as TrainingProgress);
      }
      if (pct === 100) addToast('success', 'Поздравляем! Материал отмечен как изученный');
      else if (pct > 0) addToast('success', 'Прогресс сохранён');
    } catch {
      addToast('error', 'Не удалось сохранить прогресс');
    } finally {
      setSavingProgress(false);
    }
  };

  const embed = material?.fileUrl ? youtubeEmbed(material.fileUrl) : null;
  const t = material ? TYPE_META[String(material.materialType ?? '')] : null;
  const pct = progress?.progressPercentage ?? 0;
  const done = pct >= 100;

  const bestAttempt = useCallback((testId: number): TestAttempt | undefined => {
    const list = attempts.filter((a) => a.knowledgeTestId === testId);
    return list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  }, [attempts]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6" />
        </div>
      </div>
    );
  }

  if (!material) return null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/learning"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        К библиотеке
      </Link>

      {/* Hero */}
      <div className={`relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br ${t?.gradient ?? 'from-gray-200 to-gray-300'}`}>
        {material.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={material.coverUrl} alt={material.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
        ) : null}
        <div className="relative p-6 sm:p-8 bg-gradient-to-t from-black/40 to-transparent">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {t && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-white/90 ${t.badge.replace('bg-', 'text-').split(' ')[0]}`}>
                {t.emoji} {t.label}
              </span>
            )}
            {material.isMandatory && (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-red-500 text-white">
                Обязательно к изучению
              </span>
            )}
            {material.category && (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-white/80 text-gray-700">
                📁 {material.category}
              </span>
            )}
            {material.durationMinutes ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-white/80 text-gray-700">
                ⏱ {material.durationMinutes} мин
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-md">{material.title}</h1>
          {material.description && (
            <p className="mt-2 text-sm text-white/90 max-w-2xl drop-shadow">{material.description}</p>
          )}
        </div>
      </div>

      {/* Player / content + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Media */}
          {embed ? (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-md">
              <iframe
                src={embed}
                title={material.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : material.fileUrl ? (
            <a
              href={material.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="block bg-violet-500 hover:bg-violet-600 text-white rounded-xl p-5 text-center shadow-sm transition-colors"
            >
              <div className="text-3xl mb-1">📎</div>
              <div className="font-semibold">Открыть материал</div>
              <div className="text-xs text-white/80 mt-1 break-all">{material.fileUrl}</div>
            </a>
          ) : null}

          {/* Content */}
          {material.content && (
            <article className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-gray-700 dark:text-gray-200">
                {material.content}
              </div>
            </article>
          )}

          {!material.content && !material.fileUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400 italic text-center">
              Контент материала ещё не добавлен.
            </div>
          )}

          {/* Tests */}
          {tests.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                Тесты по материалу ({tests.length})
              </h2>
              <div className="space-y-2">
                {tests.map((test) => {
                  const best = bestAttempt(test.id);
                  const passed = best?.passed === true;
                  return (
                    <div
                      key={test.id}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-start gap-3"
                    >
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-gray-800 dark:text-gray-100">{test.title}</span>
                          {test.isMandatory && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                              Обязательный
                            </span>
                          )}
                          {passed && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                              ✓ Сдан ({best?.score ?? 0}%)
                            </span>
                          )}
                        </div>
                        {test.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{test.description}</p>
                        )}
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                          {Array.isArray(test.questions) && <span>📝 {test.questions.length} вопросов</span>}
                          {test.passingScore != null && <span>🎯 Проходной {test.passingScore}%</span>}
                          {test.timeLimitMinutes ? <span>⏱ {test.timeLimitMinutes} мин</span> : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTestId(test.id)}
                        className="px-3 py-1.5 text-sm rounded-lg bg-violet-500 hover:bg-violet-600 text-white"
                      >
                        {passed ? 'Пересдать' : best ? 'Повторить' : 'Пройти тест'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Ваш прогресс</div>
            <div className="flex items-center gap-3">
              <ProgressDonut pct={pct} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {done ? 'Изучено' : pct > 0 ? 'В процессе' : 'Не начато'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {pct}% завершено
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {!done && (
                <button
                  type="button"
                  onClick={() => persistProgress(100)}
                  disabled={savingProgress}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Отметить как изученное
                </button>
              )}
              {done && (
                <button
                  type="button"
                  onClick={() => persistProgress(0)}
                  disabled={savingProgress}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Сбросить прогресс
                </button>
              )}
            </div>
          </div>

          {/* Tags */}
          {Array.isArray(material.tags) && (material.tags as string[]).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Теги</div>
              <div className="flex flex-wrap gap-1.5">
                {(material.tags as string[]).map((tag) => (
                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Test modal */}
      {activeTestId !== null && (
        <TestModal
          testId={activeTestId}
          onClose={() => setActiveTestId(null)}
          onCompleted={() => {
            setActiveTestId(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

// ─── Progress donut ──────────────────────────────────────────────────────────

function ProgressDonut({ pct }: { pct: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = pct >= 100 ? '#10b981' : '#8b5cf6';
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 64 64" className="-rotate-90 w-16 h-16">
        <circle cx="32" cy="32" r={r} stroke="rgba(139,92,246,0.15)" strokeWidth="6" fill="none" />
        <circle
          cx="32" cy="32" r={r}
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 500ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200">
        {pct}%
      </div>
    </div>
  );
}

// ─── Test taking modal ──────────────────────────────────────────────────────

function TestModal({ testId, onClose, onCompleted }: {
  testId: number;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const [test, setTest] = useState<KnowledgeTest | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; correctCount: number; total: number } | null>(null);
  const [startedAt] = useState<string>(new Date().toISOString());

  useEffect(() => {
    api.get(`/knowledge-tests/${testId}`)
      .then(({ data }) => setTest(data))
      .catch(() => addToast('error', 'Не удалось загрузить тест'))
      .finally(() => setLoading(false));
  }, [testId, addToast]);

  const questions: QuizQuestion[] = useMemo(() => {
    if (!test || !Array.isArray(test.questions)) return [];
    return test.questions as QuizQuestion[];
  }, [test]);

  const allAnswered = questions.length > 0 && questions.every((_, i) => i in answers);

  const submit = async () => {
    if (!user?.id || !test) return;
    if (!allAnswered) {
      addToast('warning', 'Ответьте на все вопросы');
      return;
    }
    setSubmitting(true);
    try {
      let correct = 0;
      questions.forEach((q, i) => {
        if (typeof q.correctIndex === 'number' && answers[i] === q.correctIndex) correct += 1;
      });
      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      const passingScore = test.passingScore ?? 0;
      const passed = score >= passingScore;

      await api.post('/test-attempts', {
        knowledgeTestId: test.id,
        userId: user.id,
        startedAt,
        completedAt: new Date().toISOString(),
        score,
        passed,
        answers,
      });
      setResult({ score, passed, correctCount: correct, total: questions.length });
      addToast(passed ? 'success' : 'warning', passed ? `Тест сдан: ${score}%` : `Тест не сдан: ${score}%`);
    } catch {
      addToast('error', 'Не удалось отправить ответы');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wide text-violet-600 dark:text-violet-400 font-semibold">Тест</div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
              {test?.title ?? 'Загрузка...'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Загрузка...</div>
          ) : !test ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Тест не найден</div>
          ) : result ? (
            <ResultView result={result} passingScore={test.passingScore ?? 0} onClose={onCompleted} />
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              В этом тесте пока нет вопросов.
            </div>
          ) : (
            <div className="space-y-5">
              {test.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300">{test.description}</p>
              )}
              {questions.map((q, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-4">
                  <div className="font-medium text-gray-800 dark:text-gray-100 mb-3">
                    {i + 1}. {q.question}
                  </div>
                  <div className="space-y-1.5">
                    {q.options?.map((opt, j) => {
                      const checked = answers[i] === j;
                      return (
                        <label key={j} className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${checked ? 'bg-violet-500/10 ring-1 ring-violet-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                          <input
                            type="radio"
                            name={`q-${i}`}
                            checked={checked}
                            onChange={() => setAnswers((a) => ({ ...a, [i]: j }))}
                            className="accent-violet-500"
                          />
                          <span className="text-gray-700 dark:text-gray-200">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!result && questions.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/60">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Отвечено: <b className="text-gray-700 dark:text-gray-200">{Object.keys(answers).length}</b> из {questions.length}
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !allAnswered}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50"
            >
              {submitting ? 'Отправка...' : 'Завершить тест'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultView({ result, passingScore, onClose }: { result: { score: number; passed: boolean; correctCount: number; total: number }; passingScore: number; onClose: () => void }) {
  return (
    <div className="text-center py-6">
      <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4 ${result.passed ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
        {result.passed ? '🎉' : '😕'}
      </div>
      <div className={`text-2xl font-bold ${result.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {result.passed ? 'Тест сдан!' : 'Тест не сдан'}
      </div>
      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Ваш результат: <b>{result.score}%</b> ({result.correctCount} из {result.total})
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Проходной балл: {passingScore}%
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 px-4 py-2 text-sm rounded-lg bg-violet-500 hover:bg-violet-600 text-white"
      >
        Готово
      </button>
    </div>
  );
}
