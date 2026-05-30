import { createServerSupabaseClient } from '@/lib/supabase';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart } from '@/components/charts/BarChart';
import { calcularMetricas } from '@/lib/metricas';
import { Recycle, Building2, AlertCircle, CheckCircle } from 'lucide-react';

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();

  const [
    { count: totalEmpresas },
    { count: pendientes },
    { data: recolecciones },
    { data: extracciones },
  ] = await Promise.all([
    supabase.from('empresas').select('*', { count: 'exact', head: true }),
    supabase.from('extracciones').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('recolecciones').select('tipo_material, cantidad_kg'),
    supabase.from('extracciones').select('estado').limit(200),
  ]);

  const metricas = calcularMetricas(recolecciones ?? []);

  const porMaterial = Object.entries(
    (recolecciones ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.tipo_material] = (acc[r.tipo_material] ?? 0) + Number(r.cantidad_kg);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }));

  const aprobadas = (extracciones ?? []).filter(e => e.estado === 'aprobado' || e.estado === 'corregido').length;
  const rechazadas = (extracciones ?? []).filter(e => e.estado === 'rechazado').length;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total reciclado" value={`${metricas.total_kg} kg`} icon={Recycle} color="green" />
        <MetricCard label="Empresas activas" value={String(totalEmpresas ?? 0)} icon={Building2} color="blue" />
        <MetricCard label="Pendientes validar" value={String(pendientes ?? 0)} icon={AlertCircle} color="yellow" />
        <MetricCard label="Aprobadas" value={String(aprobadas)} sub={`${rechazadas} rechazadas`} icon={CheckCircle} color="green" />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle>Reciclaje por material (total)</CardTitle></CardHeader>
        <CardBody>
          {porMaterial.length > 0
            ? <BarChart data={porMaterial} />
            : <p className="text-sm text-gray-400 py-8 text-center">Sin datos aún</p>
          }
        </CardBody>
      </Card>

      {/* Impact */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardBody className="text-center py-5">
            <p className="text-3xl font-bold text-primary-600">{metricas.co2_kg}</p>
            <p className="text-sm text-gray-500 mt-1">kg CO₂ evitado</p>
          </CardBody>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardBody className="text-center py-5">
            <p className="text-3xl font-bold text-blue-600">{metricas.agua_litros.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">litros de agua ahorrados</p>
          </CardBody>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-900/20">
          <CardBody className="text-center py-5">
            <p className="text-3xl font-bold text-yellow-600">{metricas.arboles}</p>
            <p className="text-sm text-gray-500 mt-1">árboles equivalentes</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
