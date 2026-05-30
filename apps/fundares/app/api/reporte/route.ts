import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { calcularImpactoTotal } from '@/lib/metricas';

/**
 * GET /api/reporte?empresa_id=xxx&year=2024
 * Returns JSON report data (PDF generation handled client-side with react-pdf)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresa_id');
  const year = searchParams.get('year') ?? new Date().getFullYear().toString();
  const prevYear = (parseInt(year) - 1).toString();

  if (!empresaId) {
    return NextResponse.json({ error: 'empresa_id requerido' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // Fetch empresa
  const { data: empresa } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', empresaId)
    .single();

  // Current year recolecciones
  const { data: recolecciones } = await supabase
    .from('recolecciones')
    .select('tipo_material, cantidad_kg, fecha_recoleccion')
    .eq('empresa_id', empresaId)
    .gte('fecha_recoleccion', `${year}-01-01`)
    .lte('fecha_recoleccion', `${year}-12-31`)
    .order('fecha_recoleccion');

  // Previous year for comparison
  const { data: recoleccionesPrevYear } = await supabase
    .from('recolecciones')
    .select('tipo_material, cantidad_kg, fecha_recoleccion')
    .eq('empresa_id', empresaId)
    .gte('fecha_recoleccion', `${prevYear}-01-01`)
    .lte('fecha_recoleccion', `${prevYear}-12-31`);

  const lista = recolecciones ?? [];
  const listaPrev = recoleccionesPrevYear ?? [];

  const totalKg = lista.reduce((s, r) => s + r.cantidad_kg, 0);
  const totalKgPrev = listaPrev.reduce((s, r) => s + r.cantidad_kg, 0);
  const impacto = calcularImpactoTotal(lista);

  // Aggregate by month and material
  const porMes: Record<string, Record<string, number>> = {};
  for (const r of lista) {
    const mes = r.fecha_recoleccion.slice(0, 7); // YYYY-MM
    if (!porMes[mes]) porMes[mes] = {};
    porMes[mes][r.tipo_material] = (porMes[mes][r.tipo_material] ?? 0) + r.cantidad_kg;
  }

  // Material totals
  const porMaterial: Record<string, number> = {};
  for (const r of lista) {
    porMaterial[r.tipo_material] = (porMaterial[r.tipo_material] ?? 0) + r.cantidad_kg;
  }

  return NextResponse.json({
    empresa,
    year,
    totalKg: +totalKg.toFixed(1),
    totalKgPrevYear: +totalKgPrev.toFixed(1),
    variacionPct: totalKgPrev > 0
      ? +(((totalKg - totalKgPrev) / totalKgPrev) * 100).toFixed(1)
      : null,
    impacto,
    porMes,
    porMaterial,
    recolecciones: lista,
  });
}
