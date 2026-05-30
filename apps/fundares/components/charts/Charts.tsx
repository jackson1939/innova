'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

const MATERIAL_COLORS: Record<string, string> = {
  plastico: '#22c55e',
  papel:    '#3b82f6',
  vidrio:   '#a855f7',
  metal:    '#f59e0b',
  carton:   '#f97316',
  desconocido: '#94a3b8',
};

function getColor(name: string, idx: number) {
  return MATERIAL_COLORS[name.toLowerCase()] ??
    ['#22c55e','#3b82f6','#a855f7','#f59e0b','#f97316','#94a3b8'][idx % 6];
}

interface KgPorMesData { mes: string; kg: number }
interface PorMaterialData { name: string; value: number }

// ── Line Chart — kg over 12 months ──────────────────────────────────────────

interface KgLineChartProps {
  data: KgPorMesData[];
}

export function KgLineChart({ data }: KgLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          unit=" kg"
        />
        <Tooltip
          contentStyle={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            color: '#f1f5f9',
            fontSize: '13px',
          }}
          formatter={(v: number) => [`${v} kg`, 'Reciclado']}
        />
        <Line
          type="monotone"
          dataKey="kg"
          stroke="#16a34a"
          strokeWidth={3}
          dot={{ r: 4, fill: '#16a34a', strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#22c55e' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Donut Chart — by material ────────────────────────────────────────────────

interface MaterialPieChartProps {
  data: PorMaterialData[];
}

export function MaterialPieChart({ data }: MaterialPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={65}
          outerRadius={95}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, idx) => (
            <Cell key={entry.name} fill={getColor(entry.name, idx)} />
          ))}
        </Pie>
        <Legend
          formatter={(value: string) => (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{value}</span>
          )}
        />
        <Tooltip
          contentStyle={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            color: '#f1f5f9',
            fontSize: '13px',
          }}
          formatter={(v: number) => [`${v} kg`, '']}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Bar Chart — comparison ───────────────────────────────────────────────────

interface BarData { name: string; kg: number }
interface KgBarChartProps { data: BarData[] }

export function KgBarChart({ data }: KgBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          unit=" kg"
        />
        <Tooltip
          contentStyle={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            color: '#f1f5f9',
            fontSize: '13px',
          }}
          formatter={(v: number) => [`${v} kg`, 'Total']}
        />
        <Bar dataKey="kg" radius={[6, 6, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={entry.name} fill={getColor(entry.name, idx)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
