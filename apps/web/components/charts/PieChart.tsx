'use client';

import {
  PieChart as RePieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed','#0891b2','#65a30d'];

interface Props {
  data: { name: string; value: number }[];
}

export function PieChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RePieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => `${v} kg`} />
        <Legend iconType="circle" iconSize={10} />
      </RePieChart>
    </ResponsiveContainer>
  );
}
