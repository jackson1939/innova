'use client';

import { Leaf, Droplets, Wind, TreePine } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: 'co2' | 'water' | 'trees' | 'total';
  subtitle?: string;
  color?: 'green' | 'blue' | 'emerald' | 'teal';
  loading?: boolean;
}

const icons = {
  co2: Wind,
  water: Droplets,
  trees: TreePine,
  total: Leaf,
};

const colors = {
  green: {
    bg: 'bg-green-50 dark:bg-green-950',
    icon: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-900',
    value: 'text-green-700 dark:text-green-300',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    icon: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
    value: 'text-blue-700 dark:text-blue-300',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    icon: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900',
    value: 'text-emerald-700 dark:text-emerald-300',
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-950',
    icon: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-100 dark:bg-teal-900',
    value: 'text-teal-700 dark:text-teal-300',
  },
};

export function MetricCard({
  title,
  value,
  unit,
  icon,
  subtitle,
  color = 'green',
  loading = false,
}: MetricCardProps) {
  const Icon = icons[icon];
  const c = colors[color];

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 skeleton rounded" />
            <div className="h-8 w-32 skeleton rounded" />
            <div className="h-3 w-20 skeleton rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card p-6 ${c.bg} border-0 animate-slide-up`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${c.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold ${c.value}`}>
              {typeof value === 'number' ? value.toLocaleString('es') : value}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{unit}</span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
