'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Empresa } from '@/types';

export default function AdminReportesPage() {
  const [empresas,   setEmpresas]   = useState<Empresa[]>([]);
  const [empresaId,  setEmpresaId]  = useState('');
  const [anio,       setAnio]       = useState(new Date().getFullYear());
  const [loading,    setLoading]    = useState(true);
  const [generando,  setGenerando]  = useState(false);

  useEffect(() => {
    fetch('/api/empresas')
      .then(r => r.json())
      .then((j: { data: Empresa[] }) => { setEmpresas(j.data ?? []); setLoading(false); });
  }, []);

  async function handleDescargar() {
    if (!empresaId) return;
    setGenerando(true);
    const url = `/api/reporte?empresa_id=${empresaId}&anio=${anio}`;
    const res  = await fetch(url);
    if (!res.ok) { setGenerando(false); return; }
    const blob = await res.blob();
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `reporte-${anio}.pdf`;
    a.click();
    setGenerando(false);
  }

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generar reportes</h1>

      <Card>
        <CardHeader><CardTitle>Reporte anual PDF</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Empresa</label>
            {loading ? <Skeleton className="h-10" /> : (
              <select
                value={empresaId} onChange={e => setEmpresaId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">Seleccionar empresa…</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Año</label>
            <input
              type="number" value={anio} onChange={e => setAnio(Number(e.target.value))}
              min={2020} max={new Date().getFullYear()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
            />
          </div>

          <Button onClick={handleDescargar} disabled={!empresaId || generando} className="w-full">
            <Download className="w-4 h-4" />
            {generando ? 'Generando PDF…' : 'Descargar reporte PDF'}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
