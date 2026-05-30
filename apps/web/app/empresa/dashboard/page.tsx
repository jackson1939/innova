'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart } from '@/components/charts/LineChart';
import { PieChart }  from '@/components/charts/PieChart';
import { Recycle, Droplets, TreePine, Wind } from 'lucide-react';
import type { MetricasImpacto } from '@/types';

interface DashData {
  metricas:     MetricasImpacto;
  series:       { mes: string; kg: number }[];
  distribucion: Record<string, number>;
}

export default function EmpresaDashboardPage() {
  const [data,    setData]    = useState<DashData | null>(null);
  const [tips,    setTips]    = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function cargar() {
      const res  = await fetch('/api/metricas');
      const json = await res.json() as DashData;
      setData(json);
      setLoading(false);
    }
    cargar();

    const channel = supabase.channel('recolecciones-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recolecciones' }, cargar)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const pieData = data
    ? Object.entries(data.distribucion).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))
    : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi impacto ambiental</h1>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard loading={loading} label="Total reciclado"  value={`${data?.metricas.total_kg ?? 0} kg`}        icon={Recycle}   color="green"  />
        <MetricCard loading={loading} label="CO₂ evitado"      value={`${data?.metricas.co2_kg ?? 0} kg`}          icon={Wind}      color="blue"   />
        <MetricCard loading={loading} label="Agua ahorrada"    value={`${(data?.metricas.agua_litros ?? 0).toLocaleString()} L`} icon={Droplets} color="blue" />
        <MetricCard loading={loading} label="Árboles salvados" value={String(data?.metricas.arboles ?? 0)}          icon={TreePine}  color="green"  />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Reciclaje mensual (kg)</CardTitle></CardHeader>
          <CardBody>
            {loading ? <Skeleton className="h-60" /> : <LineChart data={data?.series ?? []} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Por tipo de material</CardTitle></CardHeader>
          <CardBody>
            {loading ? <Skeleton className="h-60" /> : (
              pieData.length > 0
                ? <PieChart data={pieData} />
                : <p className="text-center text-gray-400 py-20">Sin datos aún</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Tips */}
      {tips && (
        <Card className="bg-primary-50 dark:bg-primary-900/20">
          <CardHeader><CardTitle>💡 Tips personalizados</CardTitle></CardHeader>
          <CardBody>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {tips.split('\n').map((line, i) => <p key={i} className="text-sm">{line}</p>)}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
