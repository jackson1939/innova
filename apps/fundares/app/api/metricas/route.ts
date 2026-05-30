import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { calcularImpactoTotal, calcularKgPorMes, calcularPorMaterial } from '@/lib/metricas';

/**
 * GET /api/metricas?empresa_id=xxx&year=2024
 * Returns impact metrics and chart data for an empresa
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresa_id');
  const year = searchParams.get('year') ?? new Date().getFullYear().toString();

  if (!empresaId) {
    return NextResponse.json({ error: 'empresa_id requerido' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  const { data: recolecciones, error } = await supabase
    .from('recolecciones')
    .select('tipo_material, cantidad_kg, fecha_recoleccion')
    .eq('empresa_id', empresaId)
    .gte('fecha_recoleccion', `${year}-01-01`)
    .lte('fecha_recoleccion', `${year}-12-31`)
    .order('fecha_recoleccion', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const impacto = calcularImpactoTotal(recolecciones ?? []);
  const kgPorMes = calcularKgPorMes(recolecciones ?? []);
  const porMaterial = calcularPorMaterial(recolecciones ?? []);
  const totalKg = (recolecciones ?? []).reduce((sum, r) => sum + r.cantidad_kg, 0);

  return NextResponse.json({
    totalKg: +totalKg.toFixed(1),
    impacto,
    kgPorMes,
    porMaterial,
    year,
  });
}
