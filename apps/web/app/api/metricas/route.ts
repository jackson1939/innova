import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { calcularMetricas } from '@/lib/metricas';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: perfil } = await supabase
    .from('perfiles').select('rol, empresa_id').eq('id', user.id).single();

  const empresa_id = req.nextUrl.searchParams.get('empresa_id') ?? perfil?.empresa_id;

  let query = supabase
    .from('recolecciones')
    .select('tipo_material, cantidad_kg, fecha_recoleccion');

  if (perfil?.rol === 'empresa') {
    query = query.eq('empresa_id', perfil.empresa_id!);
  } else if (empresa_id) {
    query = query.eq('empresa_id', empresa_id);
  }

  const { data: recolecciones } = await query;
  if (!recolecciones) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const metricas = calcularMetricas(recolecciones);

  // Build monthly series for charts (last 12 months)
  const meses: Record<string, number> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses[d.toISOString().slice(0, 7)] = 0;
  }
  for (const r of recolecciones) {
    const mes = r.fecha_recoleccion.slice(0, 7);
    if (mes in meses) meses[mes] += Number(r.cantidad_kg);
  }

  const series = Object.entries(meses).map(([mes, kg]) => ({ mes, kg }));

  // Material distribution
  const distribucion: Record<string, number> = {};
  for (const r of recolecciones) {
    distribucion[r.tipo_material] = (distribucion[r.tipo_material] ?? 0) + Number(r.cantidad_kg);
  }

  return NextResponse.json({ metricas, series, distribucion });
}
