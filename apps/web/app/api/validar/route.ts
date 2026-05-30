import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: perfil } = await supabase
    .from('perfiles').select('rol').eq('id', user.id).single();
  if (perfil?.rol !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    extraccion_id: string;
    accion: 'aprobar' | 'rechazar' | 'corregir';
    empresa_id?: string;
    tipo_material?: string;
    cantidad_kg?: number;
    fecha_recoleccion?: string;
  };

  const service = createServiceClient();

  if (body.accion === 'rechazar') {
    await service.from('extracciones')
      .update({ estado: 'rechazado', corregido_por: user.id })
      .eq('id', body.extraccion_id);

    await service.from('mensajes_recolector')
      .update({ estado: 'rechazado' })
      .eq('id', (await service.from('extracciones')
        .select('mensaje_id').eq('id', body.extraccion_id).single()).data?.mensaje_id);

    return NextResponse.json({ ok: true });
  }

  // aprobar or corregir
  const { data: ext } = await service.from('extracciones')
    .select('*').eq('id', body.extraccion_id).single();

  if (!ext) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const tipo_material     = body.tipo_material     ?? ext.tipo_material;
  const cantidad_kg       = body.cantidad_kg       ?? ext.cantidad_kg;
  const fecha_recoleccion = body.fecha_recoleccion ?? ext.fecha_recoleccion;
  const empresa_id        = body.empresa_id        ?? ext.empresa_id;
  const estado            = body.accion === 'corregir' ? 'corregido' : 'aprobado';

  await service.from('extracciones')
    .update({ estado, tipo_material, cantidad_kg, fecha_recoleccion, empresa_id, corregido_por: user.id })
    .eq('id', body.extraccion_id);

  await service.from('recolecciones').insert({
    extraccion_id:     body.extraccion_id,
    empresa_id,
    tipo_material,
    cantidad_kg,
    fecha_recoleccion,
    validado_por: user.id,
  });

  await service.from('mensajes_recolector')
    .update({ estado: 'validado' })
    .eq('id', ext.mensaje_id);

  return NextResponse.json({ ok: true });
}
