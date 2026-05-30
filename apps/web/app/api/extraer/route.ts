import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { extraerDatosReciclaje } from '@/lib/claude';
import { extraerTextoMultiplesImagenes } from '@/lib/ocr';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { mensaje_id } = await req.json() as { mensaje_id: string };
  const supabase = createServiceClient();

  // Mark as processing
  await supabase
    .from('mensajes_recolector')
    .update({ estado: 'procesando' })
    .eq('id', mensaje_id);

  // Fetch message
  const { data: mensaje } = await supabase
    .from('mensajes_recolector')
    .select('*')
    .eq('id', mensaje_id)
    .single();

  if (!mensaje) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  try {
    // OCR on photos if any
    let textoOcr = '';
    if (mensaje.fotos_urls?.length) {
      textoOcr = await extraerTextoMultiplesImagenes(mensaje.fotos_urls);
    }

    // Extract with Claude
    const texto = mensaje.contenido_texto ?? '';
    const { datos, confianza } = await extraerDatosReciclaje(texto, textoOcr || undefined);

    // Find empresa by name (best effort)
    let empresa_id: string | null = null;
    if (datos.empresa) {
      const { data: emp } = await supabase
        .from('empresas')
        .select('id')
        .ilike('nombre', `%${datos.empresa}%`)
        .limit(1)
        .single();
      empresa_id = emp?.id ?? null;
    }

    if (datos.tipo_material && datos.cantidad_kg && datos.fecha) {
      await supabase.from('extracciones').insert({
        mensaje_id,
        empresa_id,
        tipo_material:     datos.tipo_material,
        cantidad_kg:       datos.cantidad_kg,
        fecha_recoleccion: datos.fecha,
        confianza_ia:      confianza,
        datos_raw:         datos,
        estado:            'pendiente',
      });
    }

    await supabase
      .from('mensajes_recolector')
      .update({ estado: 'extraido' })
      .eq('id', mensaje_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Extraction error:', err);
    await supabase
      .from('mensajes_recolector')
      .update({ estado: 'rechazado' })
      .eq('id', mensaje_id);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}
