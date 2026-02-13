'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ContainerLogsProps {
  containerId: string;
  onClose: () => void;
}

interface LogLine {
  timestamp: string;
  message: string;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const MAX_RECONNECT_ATTEMPTS = 3;

export default function ContainerLogs({ containerId, onClose }: ContainerLogsProps) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [paused, setPaused] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pausedRef = useRef(paused);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);

  pausedRef.current = paused;

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    setErrorMessage('');

    // EventSource doesn't support custom headers, so pass token as query param
    const token = localStorage.getItem('accessToken') || '';
    const url = `/api/docker/containers/${containerId}/logs?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnectionStatus('connected');
      setErrorMessage('');
      reconnectCountRef.current = 0; // Reset on successful connection
    };

    es.onmessage = (event) => {
      if (pausedRef.current) return;
      try {
        const data = JSON.parse(event.data) as LogLine;
        setLogs((prev) => [...prev.slice(-500), data]);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      reconnectCountRef.current++;

      if (reconnectCountRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setConnectionStatus('error');
        setErrorMessage('Не удалось подключиться после нескольких попыток');
        return;
      }

      setConnectionStatus('error');
      setErrorMessage(`Переподключение (${reconnectCountRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);

      // Auto-reconnect with increasing delay
      const delay = reconnectCountRef.current * 3000;
      reconnectTimeoutRef.current = setTimeout(() => {
        if (eventSourceRef.current === es) {
          connectSSE();
        }
      }, delay);
    };
  }, [containerId]);

  useEffect(() => {
    connectSSE();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectSSE]);

  useEffect(() => {
    if (!paused) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, paused]);

  const handleClear = () => setLogs([]);

  const handleTogglePause = () => {
    setPaused(!paused);
  };

  const handleReconnect = () => {
    reconnectCountRef.current = 0;
    connectSSE();
  };

  const statusIndicator = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <span className="flex items-center gap-1.5 text-yellow-400 text-xs"><span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />Подключение...</span>;
      case 'connected':
        return <span className="flex items-center gap-1.5 text-green-400 text-xs"><span className="w-2 h-2 rounded-full bg-green-400" />Подключено</span>;
      case 'disconnected':
        return <span className="flex items-center gap-1.5 text-gray-400 text-xs"><span className="w-2 h-2 rounded-full bg-gray-400" />Отключено</span>;
      case 'error':
        return <span className="flex items-center gap-1.5 text-red-400 text-xs"><span className="w-2 h-2 rounded-full bg-red-400" />Ошибка</span>;
    }
  };

  return (
    <div className="bg-gray-950 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300 font-mono">
            Логи: {containerId.substring(0, 12)}
          </span>
          {statusIndicator()}
        </div>
        <div className="flex gap-2">
          {connectionStatus === 'error' && (
            <button
              className="btn-xs text-sky-400 hover:text-sky-300 border-gray-700 hover:border-gray-600"
              onClick={handleReconnect}
            >
              Переподключить
            </button>
          )}
          <button
            className="btn-xs text-gray-400 hover:text-white border-gray-700 hover:border-gray-600"
            onClick={handleClear}
          >
            Очистить
          </button>
          <button
            className={`btn-xs border-gray-700 hover:border-gray-600 ${
              paused ? 'text-green-400' : 'text-yellow-400'
            }`}
            onClick={handleTogglePause}
          >
            {paused ? 'Продолжить' : 'Пауза'}
          </button>
          <button
            className="btn-xs text-red-400 hover:text-red-300 border-gray-700 hover:border-gray-600"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
      <div className="h-80 overflow-y-auto p-4 font-mono text-xs text-green-400 space-y-0.5">
        {logs.length === 0 && connectionStatus === 'connected' && (
          <p className="text-gray-500">Контейнер не выводит логи</p>
        )}
        {logs.length === 0 && connectionStatus === 'connecting' && (
          <p className="text-gray-500">Подключение к контейнеру...</p>
        )}
        {logs.length === 0 && connectionStatus === 'error' && (
          <p className="text-red-400/70">{errorMessage || 'Не удалось подключиться к логам контейнера'}</p>
        )}
        {logs.map((log, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            <span className="text-gray-600">{log.timestamp.substring(11, 19)} </span>
            {log.message}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
