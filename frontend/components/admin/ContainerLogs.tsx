'use client';

import { useState, useEffect, useRef } from 'react';

interface ContainerLogsProps {
  containerId: string;
  onClose: () => void;
}

interface LogLine {
  timestamp: string;
  message: string;
}

export default function ContainerLogs({ containerId, onClose }: ContainerLogsProps) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [paused, setPaused] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const url = `/api/docker/containers/${containerId}/logs`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      if (paused) return;
      try {
        const data = JSON.parse(event.data) as LogLine;
        setLogs((prev) => [...prev.slice(-500), data]);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [containerId, paused]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleClear = () => setLogs([]);

  const handleTogglePause = () => {
    if (!paused) {
      eventSourceRef.current?.close();
    }
    setPaused(!paused);
  };

  return (
    <div className="bg-gray-950 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <span className="text-sm text-gray-300 font-mono">
          Logs: {containerId.substring(0, 12)}
        </span>
        <div className="flex gap-2">
          <button
            className="btn-xs text-gray-400 hover:text-white border-gray-700 hover:border-gray-600"
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            className={`btn-xs border-gray-700 hover:border-gray-600 ${
              paused ? 'text-green-400' : 'text-yellow-400'
            }`}
            onClick={handleTogglePause}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="btn-xs text-red-400 hover:text-red-300 border-gray-700 hover:border-gray-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
      <div className="h-80 overflow-y-auto p-4 font-mono text-xs text-green-400 space-y-0.5">
        {logs.length === 0 && (
          <p className="text-gray-500">Ожидание логов...</p>
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
