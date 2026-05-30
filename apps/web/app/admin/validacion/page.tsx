'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { ValidacionCard } from '@/components/ValidacionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Extraccion, Empresa } from '@/types';

export default function ValidacionPage() {
  const [extracciones, setExtracciones] = useState<Extraccion[]>([]);
  const [empresas,     setEmpresas]     = useState<Empresa[]>([]);
  const [loading,      setLoading]      = useState(true);
  const supabase = createClient();

  const cargar = useCallback(async () => {
    setLoading(true);
    const [{ data: exts }, { data: emps }] = await Promise.all([
      supabase
        .from('extracciones')
        .select('*, empresas(nombre), mensajes_recolector(contenido_texto, fotos_urls)')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false }),
      supabase.from('empresas').select('*').order('nombre'),
    ]);
    setExtracciones((exts as Extraccion[]) ?? []);
    setEmpresas((emps as Empresa[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();

    // Realtime subscription
    const channel = supabase.channel('extracciones-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extracciones' }, cargar)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cargar]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Validación de extracciones</h1>
        {!loading && (
          <Badge variant="yellow">{extracciones.length} pendientes</Badge>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : extracciones.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">Sin extracciones pendientes 🎉</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {extracciones.map(ext => (
            <ValidacionCard
              key={ext.id}
              extraccion={ext}
              empresas={empresas}
              onActualizar={cargar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
