'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { ContainerInfo } from '@/types/docker';

interface AdminChartsProps {
  containers: ContainerInfo[];
}

const STATE_LABELS: Record<string, string> = {
  running: 'Работает',
  exited: 'Остановлен',
  restarting: 'Перезапуск',
  paused: 'Пауза',
  dead: 'Ошибка',
};

const STATE_COLORS: Record<string, string> = {
  running: '#3ec972',
  exited: '#ff5656',
  restarting: '#f0bb33',
  paused: '#f0bb33',
  dead: '#ff5656',
};

export default function AdminCharts({ containers }: AdminChartsProps) {
  // Group by state
  const stateCount: Record<string, number> = {};
  containers.forEach((c) => {
    const state = c.state || 'unknown';
    stateCount[state] = (stateCount[state] || 0) + 1;
  });

  const pieData = Object.entries(stateCount).map(([state, count]) => ({
    name: STATE_LABELS[state] || state,
    value: count,
    color: STATE_COLORS[state] || '#6b7280',
  }));

  if (containers.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">
        Состояние сервисов
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-gray-800)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
