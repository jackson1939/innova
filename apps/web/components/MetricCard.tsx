import { Card, CardBody } from './ui/card';
import { Skeleton } from './ui/skeleton';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color?: 'green' | 'blue' | 'yellow' | 'purple';
  loading?: boolean;
}

const colorMap = {
  green:  { bg: 'bg-primary-50',  icon: 'bg-primary-100 text-primary-600' },
  blue:   { bg: 'bg-blue-50',     icon: 'bg-blue-100 text-blue-600' },
  yellow: { bg: 'bg-yellow-50',   icon: 'bg-yellow-100 text-yellow-600' },
  purple: { bg: 'bg-purple-50',   icon: 'bg-purple-100 text-purple-600' },
};

export function MetricCard({ label, value, sub, icon: Icon, color = 'green', loading }: MetricCardProps) {
  const c = colorMap[color];
  if (loading) return (
    <Card className={c.bg}>
      <CardBody className="flex gap-4 items-center">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      </CardBody>
    </Card>
  );

  return (
    <Card className={c.bg}>
      <CardBody className="flex gap-4 items-center">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardBody>
    </Card>
  );
}
