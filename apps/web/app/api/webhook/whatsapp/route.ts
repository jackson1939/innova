import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  // Verify Twilio signature (basic secret check)
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.formData().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const texto    = (body.get('Body') as string | null) ?? '';
  const numMedia = parseInt((body.get('NumMedia') as string | null) ?? '0', 10);
  const fotos: string[] = [];

  for (let i = 0; i < numMedia; i++) {
    const url = body.get(`MediaUrl${i}`) as string | null;
    if (url) fotos.push(url);
  }

  const supabase = createServiceClient();

  // Save raw message
  const { data: mensaje, error } = await supabase
    .from('mensajes_recolector')
    .insert({ contenido_texto: texto, fotos_urls: fotos, estado: 'pendiente' })
    .select('id')
    .single();

  if (error || !mensaje) {
    console.error('Error saving message:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  // Trigger extraction in background (no await — respond immediately)
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/extraer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.WEBHOOK_SECRET! },
    body: JSON.stringify({ mensaje_id: mensaje.id }),
  }).catch(console.error);

  // TwiML response (empty OK)
  return new NextResponse('<?xml version="1.0"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });
}
