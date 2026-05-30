import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { extraerTextoDeImagenes } from '@/lib/ocr';
import { extraerDatosDeTexto } from '@/lib/claude';
import { z } from 'zod';

const ExtraerSchema = z.object({
  mensaje_id: z.string().uuid(),
});

/**
 * POST /api/extraer
 * Manually trigger AI extraction for a message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mensaje_id } = ExtraerSchema.parse(body);

    const supabase = createSupabaseAdmin();

    const { data: mensaje, error } = await supabase
      .from('mensajes_recolector')
      .select('*')
      .eq('id', mensaje_id)
      .single();

    if (error || !mensaje) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    await supabase
      .from('mensajes_recolector')
      .update({ estado: 'procesando' })
      .eq('id', mensaje_id);

    const textoOcr = await extraerTextoDeImagenes(mensaje.fotos_urls ?? []);
    const extraccion = await extraerDatosDeTexto(
      mensaje.contenido_texto ?? '',
      textoOcr || undefined
    );

    const { data: savedExtraccion, error: saveError } = await supabase
      .from('extracciones')
      .insert({
        mensaje_id,
        tipo_material: extraccion.tipo_material ?? 'desconocido',
        cantidad_kg: extraccion.cantidad_kg ?? 0,
        fecha_recoleccion:
          extraccion.fecha ?? new Date().toISOString().split('T')[0],
        confianza_ia: extraccion.confianza,
        datos_raw: extraccion as Record<string, unknown>,
        estado: 'pendiente',
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    await supabase
      .from('mensajes_recolector')
      .update({ estado: 'extraido' })
      .eq('id', mensaje_id);

    return NextResponse.json({ extraccion: savedExtraccion });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
