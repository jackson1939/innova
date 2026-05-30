export async function extraerTextoImagen(imageUrl: string): Promise<string> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) return '';

  const body = {
    requests: [{
      image: { source: { imageUri: imageUrl } },
      features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
    }],
  };

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );

  if (!res.ok) return '';

  const data = await res.json() as {
    responses: { fullTextAnnotation?: { text: string } }[];
  };

  return data.responses[0]?.fullTextAnnotation?.text ?? '';
}

export async function extraerTextoMultiplesImagenes(urls: string[]): Promise<string> {
  const textos = await Promise.all(urls.map(extraerTextoImagen));
  return textos.filter(Boolean).join('\n');
}
