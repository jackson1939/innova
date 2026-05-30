import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const ValidarSchema = z.object({
  extraccion_id: z.string().uuid(),
  accion: z.enum(['aprobar', 'rechazar', 'corregir']),
  correcciones: z
    .object({
      empresa_id: z.string().uuid().optional(),
      tipo_material: z.string().optional(),
      cantidad_kg: z.number().positive().optional(),
      fecha_recoleccion: z.string().optional(),
    })
    .optional(),
  validado_por: z.string().uuid(),
});

/**
 * POST /api/validar
 * Admin approves, rejects or corrects an AI extraction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { extraccion_id, accion, correcciones, validado_por } = ValidarSchema.parse(body);

    const supabase = createSupabaseAdmin();

    // Fetch the extraction
    const { data: extraccion, error: fetchError } = await supabase
      .from('extracciones')
      .select('*')
      .eq('id', extraccion_id)
      .single();

    if (fetchError || !extraccion) {
      return NextResponse.json({ error: 'Extracción no encontrada' }, { status: 404 });
    }

    if (accion === 'rechazar') {
      await supabase
        .from('extracciones')
        .update({ estado: 'rechazado', corregido_por: validado_por })
        .eq('id', extraccion_id);

      // Update parent message
      if (extraccion.mensaje_id) {
        await supabase
          .from('mensajes_recolector')
          .update({ estado: 'rechazado' })
          .eq('id', extraccion.mensaje_id);
      }

      return NextResponse.json({ ok: true, accion: 'rechazado' });
    }

    // Merge corrections
    const datosFinales = {
      empresa_id: correcciones?.empresa_id ?? extraccion.empresa_id,
      tipo_material: correcciones?.tipo_material ?? extraccion.tipo_material,
      cantidad_kg: correcciones?.cantidad_kg ?? extraccion.cantidad_kg,
      fecha_recoleccion: correcciones?.fecha_recoleccion ?? extraccion.fecha_recoleccion,
    };

    if (!datosFinales.empresa_id) {
      return NextResponse.json(
        { error: 'Se requiere empresa_id para aprobar' },
        { status: 400 }
      );
    }

    // Create validated recoleccion
    const { data: recoleccion, error: recoleccionError } = await supabase
      .from('recolecciones')
      .insert({
        extraccion_id,
        empresa_id: datosFinales.empresa_id,
        tipo_material: datosFinales.tipo_material,
        cantidad_kg: datosFinales.cantidad_kg,
        fecha_recoleccion: datosFinales.fecha_recoleccion,
        validado_por,
      })
      .select()
      .single();

    if (recoleccionError) {
      return NextResponse.json({ error: recoleccionError.message }, { status: 500 });
    }

    // Update extraction state
    await supabase
      .from('extracciones')
      .update({
        estado: accion === 'corregir' ? 'corregido' : 'aprobado',
        empresa_id: datosFinales.empresa_id,
        tipo_material: datosFinales.tipo_material,
        cantidad_kg: datosFinales.cantidad_kg,
        fecha_recoleccion: datosFinales.fecha_recoleccion,
        corregido_por: validado_por,
      })
      .eq('id', extraccion_id);

    // Update parent message
    if (extraccion.mensaje_id) {
      await supabase
        .from('mensajes_recolector')
        .update({ estado: 'validado' })
        .eq('id', extraccion.mensaje_id);
    }

    return NextResponse.json({ ok: true, recoleccion });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * GET /api/validar?estado=pendiente
 * List extractions pending validation
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado') ?? 'pendiente';

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('extracciones')
    .select(`
      *,
      mensajes_recolector (contenido_texto, fotos_urls, recibido_at),
      empresas (nombre)
    `)
    .eq('estado', estado)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
