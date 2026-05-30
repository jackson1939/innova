import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ExtraccionResult {
  empresa: string | null;
  tipo_material: string | null;
  cantidad_kg: number | null;
  fecha: string | null;
  notas: string | null;
  confianza: number;
}

const SYSTEM_PROMPT = `Eres un asistente de extracción de datos de reciclaje para Fundares.
Dado un mensaje de un recolector, extrae en JSON:
{
  "empresa": string | null,
  "tipo_material": string | null,  // plastico, papel, vidrio, metal, carton
  "cantidad_kg": number | null,
  "fecha": string | null,  // formato YYYY-MM-DD
  "notas": string | null,
  "confianza": number  // 0-1, qué tan segura estás de la extracción
}
Si no puedes determinar un campo con certeza, ponlo como null.
Responde SOLO el JSON, sin explicaciones ni markdown.`;

export async function extraerDatosDeTexto(
  textoMensaje: string,
  textoOcr?: string
): Promise<ExtraccionResult> {
  const contenido = textoOcr
    ? `Mensaje del recolector:\n${textoMensaje}\n\nTexto extraído de imagen (OCR):\n${textoOcr}`
    : `Mensaje del recolector:\n${textoMensaje}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    messages: [{ role: 'user', content: contenido }],
    system: SYSTEM_PROMPT,
  });

  const responseText =
    message.content[0].type === 'text' ? message.content[0].text : '{}';

  try {
    const parsed = JSON.parse(responseText) as ExtraccionResult;
    return {
      empresa: parsed.empresa ?? null,
      tipo_material: parsed.tipo_material ?? null,
      cantidad_kg: parsed.cantidad_kg ?? null,
      fecha: parsed.fecha ?? null,
      notas: parsed.notas ?? null,
      confianza: parsed.confianza ?? 0.5,
    };
  } catch {
    return {
      empresa: null,
      tipo_material: null,
      cantidad_kg: null,
      fecha: null,
      notas: textoMensaje,
      confianza: 0,
    };
  }
}

export async function generarTipsPersonalizados(
  historial: { tipo_material: string; cantidad_kg: number; fecha_recoleccion: string }[]
): Promise<string> {
  const resumen = historial
    .slice(0, 20)
    .map((r) => `${r.fecha_recoleccion}: ${r.tipo_material} ${r.cantidad_kg}kg`)
    .join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Historial de reciclaje de esta empresa:\n${resumen}\n\nGenera 3 tips cortos y personalizados (en español) para mejorar su reciclaje basado en este historial. Responde en markdown con bullets.`,
      },
    ],
  });

  return message.content[0].type === 'text'
    ? message.content[0].text
    : '- Continúa con tu buen trabajo de reciclaje.';
}
