import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { extraerTextoDeImagenes } from '@/lib/ocr';
import { extraerDatosDeTexto } from '@/lib/claude';

/**
 * POST /api/webhook/whatsapp
 * Receives Twilio WhatsApp webhook, stores raw message, fires background AI processing
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const body = formData.get('Body')?.toString() ?? '';
    const numMedia = parseInt(formData.get('NumMedia')?.toString() ?? '0', 10);

    // Collect media URLs
    const fotosUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const url = formData.get(`MediaUrl${i}`)?.toString();
      if (url) fotosUrls.push(url);
    }

    const supabase = createSupabaseAdmin();

    // Store raw message
    const { data: mensaje, error } = await supabase
      .from('mensajes_recolector')
      .insert({
        contenido_texto: body || null,
        fotos_urls: fotosUrls.length > 0 ? fotosUrls : null,
        estado: 'pendiente',
      })
      .select()
      .single();

    if (error || !mensaje) {
      console.error('Error saving message:', error);
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Fire background processing (no await — respond immediately to Twilio)
    procesarMensajeEnBackground(mensaje.id, body, fotosUrls);

    // Respond immediately with empty TwiML
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' }, status: 200 }
    );
  } catch (err) {
    console.error('Webhook error:', err);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' }, status: 200 }
    );
  }
}

async function procesarMensajeEnBackground(
  mensajeId: string,
  texto: string,
  fotosUrls: string[]
) {
  const supabase = createSupabaseAdmin();

  try {
    // Update to 'procesando'
    await supabase
      .from('mensajes_recolector')
      .update({ estado: 'procesando' })
      .eq('id', mensajeId);

    // OCR for images
    const textoOcr = await extraerTextoDeImagenes(fotosUrls);

    // AI extraction
    const extraccion = await extraerDatosDeTexto(texto, textoOcr || undefined);

    if (!extraccion.tipo_material || !extraccion.cantidad_kg || !extraccion.fecha) {
      await supabase
        .from('mensajes_recolector')
        .update({ estado: 'extraido' })
        .eq('id', mensajeId);

      // Still store the partial extraction for manual review
      await supabase.from('extracciones').insert({
        mensaje_id: mensajeId,
        tipo_material: extraccion.tipo_material ?? 'desconocido',
        cantidad_kg: extraccion.cantidad_kg ?? 0,
        fecha_recoleccion: extraccion.fecha ?? new Date().toISOString().split('T')[0],
        confianza_ia: extraccion.confianza,
        datos_raw: extraccion as Record<string, unknown>,
        estado: 'pendiente',
      });
      return;
    }

    // Save extraction
    await supabase.from('extracciones').insert({
      mensaje_id: mensajeId,
      tipo_material: extraccion.tipo_material,
      cantidad_kg: extraccion.cantidad_kg,
      fecha_recoleccion: extraccion.fecha,
      confianza_ia: extraccion.confianza,
      datos_raw: extraccion as Record<string, unknown>,
      estado: 'pendiente',
    });

    await supabase
      .from('mensajes_recolector')
      .update({ estado: 'extraido' })
      .eq('id', mensajeId);
  } catch (err) {
    console.error('Background processing error:', err);
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook active' });
}
