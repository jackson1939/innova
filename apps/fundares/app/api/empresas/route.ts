import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const EmpresaSchema = z.object({
  nombre: z.string().min(1),
  logo_url: z.string().url().optional(),
  contacto_email: z.string().email().optional(),
});

/**
 * GET /api/empresas — List all companies
 */
export async function GET() {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .order('nombre');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/**
 * POST /api/empresas — Create company
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = EmpresaSchema.parse(body);

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('empresas')
      .insert(parsed)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * PATCH /api/empresas?id=xxx — Update company
 */
export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  try {
    const body = await request.json();
    const parsed = EmpresaSchema.partial().parse(body);

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('empresas')
      .update(parsed)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/empresas?id=xxx — Delete company
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from('empresas').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
