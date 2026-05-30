import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase';
import { generarReportePDF } from '@/lib/pdf';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: perfil } = await supabase
    .from('perfiles').select('rol, empresa_id').eq('id', user.id).single();

  const empresa_id = req.nextUrl.searchParams.get('empresa_id') ?? perfil?.empresa_id;
  const anio       = parseInt(req.nextUrl.searchParams.get('anio') ?? String(new Date().getFullYear()), 10);

  if (!empresa_id) return NextResponse.json({ error: 'empresa_id required' }, { status: 400 });
  if (perfil?.rol === 'empresa' && perfil.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = createServiceClient();

  const [{ data: empresa }, { data: recolecciones }] = await Promise.all([
    service.from('empresas').select('*').eq('id', empresa_id).single(),
    service.from('recolecciones')
      .select('*')
      .eq('empresa_id', empresa_id)
      .gte('fecha_recoleccion', `${anio}-01-01`)
      .lte('fecha_recoleccion', `${anio}-12-31`)
      .order('fecha_recoleccion'),
  ]);

  if (!empresa || !recolecciones) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const buffer = await generarReportePDF(empresa, recolecciones, anio);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-${empresa.nombre}-${anio}.pdf"`,
    },
  });
}
