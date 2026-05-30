'use client';

import {
  BarChart as ReBarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
  data: { name: string; value: number }[];
}

export function BarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ReBarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit=" kg" />
        <Tooltip formatter={(v: number) => [`${v} kg`, 'Reciclado']} />
        <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} />
      </ReBarChart>
    </ResponsiveContainer>
  );
}
