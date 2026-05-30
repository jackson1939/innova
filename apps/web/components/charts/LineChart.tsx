'use client';

import {
  LineChart as ReLineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
  data: { mes: string; kg: number }[];
}

export function LineChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ReLineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} unit=" kg" />
        <Tooltip formatter={(v: number) => [`${v} kg`, 'Reciclado']} />
        <Line type="monotone" dataKey="kg" stroke="#16a34a" strokeWidth={2} dot={false} />
      </ReLineChart>
    </ResponsiveContainer>
  );
}
