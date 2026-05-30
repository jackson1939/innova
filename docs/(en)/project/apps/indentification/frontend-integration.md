# Fundares — Next.js Integration Guide

The extraction service is called **server-side only** through Next.js Route Handlers. The external API URL is never exposed to the browser.

```bash
# .env.local
API_URL=https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com/api/v1
```

---

## Types

```typescript
// lib/extraction.types.ts

export interface Material {
  type: string;
  quantity: number | null;
  unit: 'kg' | 'unit' | null;
}

export interface ExtractionData {
  company: string | null;
  date: string | null;       // YYYY-MM-DD
  materials: Material[];
  notes: string | null;
}

export interface ExtractionResult {
  sessionId: string;
  inputType: 'text' | 'image' | 'video';
  confidence: 'high' | 'medium' | 'low';
  extracted: ExtractionData | null;
  rejectedReasons?: string[];
}
```

---

## Route Handlers

### Text — `app/api/extract/text/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const res = await fetch(`${process.env.API_URL}/extract/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

---

### Presign — `app/api/extract/presign/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { mimeType } = await req.json();

  if (!mimeType) {
    return NextResponse.json({ error: 'mimeType is required' }, { status: 400 });
  }

  const res = await fetch(`${process.env.API_URL}/extract/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

---

### Media — `app/api/extract/media/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { sessionId, type } = await req.json();

  if (!sessionId || !type) {
    return NextResponse.json({ error: 'sessionId and type are required' }, { status: 400 });
  }

  const res = await fetch(`${process.env.API_URL}/extract/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, type }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

---

## Client API helper

All components call `/api/extract/*` — the local Next.js routes, not the external API.

```typescript
// lib/extraction.client.ts

import type { ExtractionResult } from './extraction.types';

export async function extractFromText(message: string): Promise<ExtractionResult> {
  const res = await fetch('/api/extract/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok && res.status !== 422) throw new Error(await res.text());
  const { data } = await res.json();
  return data;
}

export async function extractFromFile(file: File): Promise<ExtractionResult> {
  const type = file.type.startsWith('video/') ? 'video' : 'image';

  // 1. Presign (through route handler)
  const presignRes = await fetch('/api/extract/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: file.type }),
  });
  if (!presignRes.ok) throw new Error(await presignRes.text());
  const { data: presign } = await presignRes.json();

  // 2. Upload directly to S3 (presigned URL — no server hop)
  const uploadRes = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!uploadRes.ok) throw new Error(`S3 upload failed: ${uploadRes.status}`);

  // 3. Extract (through route handler)
  const extractRes = await fetch('/api/extract/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: presign.sessionId, type }),
  });
  if (!extractRes.ok && extractRes.status !== 422) throw new Error(await extractRes.text());
  const { data } = await extractRes.json();
  return data;
}
```

> The S3 PUT still goes **directly from the browser** to S3 using the presigned URL — routing a video through the server would be unnecessarily slow.

---

## Flow 1 — Text message

```tsx
// app/extract/text/page.tsx
'use client';

import { useState } from 'react';
import { extractFromText } from '@/lib/extraction.client';
import { ExtractionOutput } from '@/components/ExtractionOutput';
import type { ExtractionResult } from '@/lib/extraction.types';

export default function TextExtractPage() {
  const [message, setMessage] = useState('');
  const [result, setResult]   = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      setResult(await extractFromText(message));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Extract from text</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          className="w-full border rounded p-2 h-32 text-sm"
          placeholder="Paste the collector's WhatsApp message…"
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Extracting…' : 'Extract'}
        </button>
      </form>
      {error  && <p className="text-red-600 text-sm">{error}</p>}
      {result && <ExtractionOutput result={result} />}
    </main>
  );
}
```

---

## Flow 2 — Image

```tsx
// app/extract/image/page.tsx
'use client';

import { useState, useRef } from 'react';
import { extractFromFile } from '@/lib/extraction.client';
import { ExtractionOutput } from '@/components/ExtractionOutput';
import type { ExtractionResult } from '@/lib/extraction.types';

export default function ImageExtractPage() {
  const inputRef              = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult]   = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      setResult(await extractFromFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Extract from image</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="block text-sm"
        />
        {preview && (
          <img src={preview} alt="Preview" className="rounded border max-h-48 object-contain" />
        )}
        <button
          type="submit"
          disabled={loading || !preview}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Uploading & extracting…' : 'Extract'}
        </button>
      </form>
      {error  && <p className="text-red-600 text-sm">{error}</p>}
      {result && <ExtractionOutput result={result} />}
    </main>
  );
}
```

---

## Flow 3 — Video

```tsx
// app/extract/video/page.tsx
'use client';

import { useState, useRef } from 'react';
import { extractFromFile } from '@/lib/extraction.client';
import { ExtractionOutput } from '@/components/ExtractionOutput';
import type { ExtractionResult } from '@/lib/extraction.types';

export default function VideoExtractPage() {
  const inputRef                = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult]     = useState<ExtractionResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      setResult(await extractFromFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Extract from video</h1>
      <p className="text-sm text-gray-500">Max 2 minutes · MP4, MOV, AVI, MKV</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/mov,video/avi,video/mkv"
          onChange={handleFileChange}
          className="block text-sm"
        />
        {fileName && <p className="text-sm text-gray-600">Selected: {fileName}</p>}
        <button
          type="submit"
          disabled={loading || !fileName}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Uploading & extracting…' : 'Extract'}
        </button>
      </form>
      {error  && <p className="text-red-600 text-sm">{error}</p>}
      {result && <ExtractionOutput result={result} />}
    </main>
  );
}
```

---

## Shared result component

```tsx
// components/ExtractionOutput.tsx
import type { ExtractionResult } from '@/lib/extraction.types';

const badge: Record<string, string> = {
  high:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-red-100 text-red-700',
};

export function ExtractionOutput({ result }: { result: ExtractionResult }) {
  if (!result.extracted || result.confidence === 'low') {
    return (
      <div className="border border-red-300 rounded p-4 space-y-2">
        <p className="font-medium text-red-600">Could not extract data</p>
        <ul className="text-sm text-gray-600 list-disc pl-4">
          {result.rejectedReasons?.map(r => <li key={r}>{r}</li>)}
        </ul>
      </div>
    );
  }

  const d = result.extracted;

  return (
    <div className="border rounded p-4 space-y-3 text-sm">
      <div className="flex justify-between items-center">
        <span className="font-medium">Extraction result</span>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${badge[result.confidence]}`}>
          {result.confidence} confidence
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-1">
        <dt className="text-gray-500">Company</dt><dd>{d.company ?? '—'}</dd>
        <dt className="text-gray-500">Date</dt>   <dd>{d.date    ?? '—'}</dd>
        {d.notes && <><dt className="text-gray-500">Notes</dt><dd>{d.notes}</dd></>}
      </dl>

      {d.materials.length > 0 && (
        <table className="w-full border-t pt-2 text-sm">
          <thead>
            <tr className="text-gray-500 text-left">
              <th className="font-normal">Material</th>
              <th className="font-normal">Qty</th>
              <th className="font-normal">Unit</th>
            </tr>
          </thead>
          <tbody>
            {d.materials.map((m, i) => (
              <tr key={i}>
                <td>{m.type}</td>
                <td>{m.quantity ?? '—'}</td>
                <td>{m.unit    ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

---

## Common mistakes

| Mistake | Fix |
|---|---|
| `API_URL` undefined at runtime | Confirm it's in `.env.local` (no `NEXT_PUBLIC_` prefix needed) |
| Wrong `Content-Type` on S3 PUT | `extractFromFile` passes `file.type` automatically — don't override |
| Treating `422` as a fetch error | `422` is a valid structured response — the client handles it already |
| Video over 2 minutes | Nova 2 Lite rejects it — trim before uploading |
| Reusing a `sessionId` | Single-use — the S3 object is deleted after `/extract/media` |
